import {
  PaymentProviderError,
  type CheckoutRequest,
  type CheckoutResult,
  type PaymentProvider,
  type VerifiedPayment,
} from './types'

/**
 * Whop — card checkout in USD for customers outside Nigeria (offered next to Flutterwave).
 * Each purchase is a one-time hosted checkout; renewals go through a new checkout, like the
 * other providers. Confirmed on return and by the reconciler — no webhooks.
 * Docs: https://docs.whop.com/api-reference/checkout-configurations/create-checkout-configuration
 */
const API_BASE = 'https://api.whop.com/api/v1'
const CHECKOUT_BASE = 'https://whop.com'

function apiKey(): string {
  const key = process.env.WHOP_API_KEY
  if (!key) throw new PaymentProviderError('WHOP_API_KEY is not set', 'whop')
  return key
}

function companyId(): string {
  const id = process.env.WHOP_COMPANY_ID
  if (!id) throw new PaymentProviderError('WHOP_COMPANY_ID is not set', 'whop')
  return id
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
  const body = await response.json().catch(() => null) as (T & { error?: { message?: string } }) | null
  if (!response.ok || !body) {
    throw new PaymentProviderError(body?.error?.message || `Whop request failed (${response.status})`, 'whop', response.status)
  }
  return body
}

interface WhopPayment {
  id: string
  checkout_configuration_id?: string | null
  metadata?: Record<string, unknown> | null
  status?: string | null
  substatus?: string | null
  total?: number | null
  usd_total?: number | null
  currency?: string | null
  paid_at?: string | null
  user?: { id?: string } | null
}

/**
 * Whop's current API no longer filters payments by checkout id ("not supported natively
 * yet"), so we page through recent payments and match the checkout id — or our reference,
 * which rides along in the checkout metadata. Checkouts older than this are abandoned.
 */
const LOOKBACK_DAYS = 4
const MAX_PAGES = 5

async function findCheckoutPayments(checkoutId: string, reference: string): Promise<WhopPayment[]> {
  const matches: WhopPayment[] = []
  let after: string | null = null
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const params = new URLSearchParams({
      account_id: companyId(),
      first: '100',
      created_after: new Date(Date.now() - LOOKBACK_DAYS * 86_400_000).toISOString(),
    })
    if (after) params.set('after', after)
    const list = await call<{ data?: WhopPayment[]; page_info?: { end_cursor?: string | null; has_next_page?: boolean } }>(
      `/payments?${params.toString()}`,
    )
    for (const entry of list.data ?? []) {
      if (entry.checkout_configuration_id === checkoutId || entry.metadata?.reference === reference) matches.push(entry)
    }
    if (!list.page_info?.has_next_page || !list.page_info.end_cursor) break
    after = list.page_info.end_cursor
  }
  return matches
}

const FAILED_SUBSTATUSES = new Set(['failed', 'blocked', 'canceled', 'uncollectible', 'refunded', 'auto_refunded'])

/** Maps a Whop payment to our three states. Exported for tests. */
export function toVerifiedStatus(payment: WhopPayment | null): VerifiedPayment['status'] {
  if (!payment) return 'pending'
  if (payment.status === 'paid' && (!payment.substatus || payment.substatus === 'succeeded')) return 'success'
  if (payment.status === 'void' || FAILED_SUBSTATUSES.has(payment.substatus ?? '')) return 'failed'
  return 'pending'
}

function planLabel(metadata: Record<string, unknown>): { title: string; identifier: string } {
  if (metadata.purpose === 'credit_pack') {
    const credits = typeof metadata.credits === 'number' ? metadata.credits.toLocaleString('en-US') : ''
    return { title: `NucleusArt credits${credits ? ` (${credits})` : ''}`, identifier: 'nucleusart-credits' }
  }
  const plan = typeof metadata.planId === 'string' ? metadata.planId : 'plan'
  const cycle = typeof metadata.cycle === 'string' ? metadata.cycle : 'monthly'
  const name = plan.charAt(0).toUpperCase() + plan.slice(1)
  return { title: `NucleusArt ${name} (${cycle})`, identifier: `nucleusart-${plan}-${cycle}` }
}

export const whopProvider: PaymentProvider = {
  id: 'whop',

  async createCheckout(request: CheckoutRequest): Promise<CheckoutResult> {
    const { title, identifier } = planLabel(request.metadata)
    const data = await call<{ id: string; purchase_url: string }>('/checkout_configurations', {
      method: 'POST',
      body: JSON.stringify({
        mode: 'payment',
        plan: {
          company_id: companyId(),
          currency: request.currency.toLowerCase(),
          title,
          plan_type: 'one_time',
          initial_price: request.amount,
          product: { external_identifier: identifier, title },
        },
        redirect_url: request.callbackUrl,
        metadata: { ...request.metadata, reference: request.reference, email: request.email },
      }),
    })
    const url = data.purchase_url.startsWith('http') ? data.purchase_url : `${CHECKOUT_BASE}${data.purchase_url}`
    // The checkout id is what Whop lets us look the payment up by later.
    return { authorizationUrl: url, providerRef: data.id }
  },

  async verify(reference: string, checkoutId?: string | null): Promise<VerifiedPayment> {
    if (!checkoutId) {
      return { reference, status: 'pending', amount: 0, currency: 'USD', paidAt: null, failureReason: 'missing_checkout_id' }
    }
    const payments = await findCheckoutPayments(checkoutId, reference)
    // A checkout can hold a failed attempt followed by a successful one: prefer the success.
    const payment = payments.find((entry) => toVerifiedStatus(entry) === 'success') ?? payments[0] ?? null
    const status = toVerifiedStatus(payment)

    return {
      reference,
      status,
      // Whop shows each buyer their local currency (a Nigerian card saw NGN 25,685 for $19),
      // so record the USD value it settles in, keeping reports and commissions in dollars.
      amount: Number(payment?.usd_total ?? payment?.total ?? 0),
      currency: payment?.usd_total != null ? 'USD' : (payment?.currency ?? 'usd').toUpperCase(),
      paidAt: payment?.paid_at ? new Date(payment.paid_at) : null,
      customerId: payment?.user?.id,
      failureReason: status === 'success' ? undefined : payment?.substatus ?? undefined,
    }
  },

  // Whop confirmations come from the return page and the reconciler, not webhooks.
  verifyWebhookSignature(): boolean {
    return false
  },

  extractReference(): string | null {
    return null
  },
}

import { timingSafeEqual } from 'node:crypto'
import {
  PaymentProviderError,
  type CheckoutRequest,
  type CheckoutResult,
  type PaymentProvider,
  type VerifiedPayment,
} from './types'
import { flutterwavePaymentOptions } from './countries'

/**
 * Flutterwave — used for every currency except Naira. Unlike Paystack, amounts are sent
 * in major units and verification is by the provider's own numeric transaction id, so we
 * look the transaction up by our reference first.
 * Docs: https://developer.flutterwave.com/docs/
 */
const BASE_URL = 'https://api.flutterwave.com/v3'

function secretKey(): string {
  const key = process.env.FLUTTERWAVE_SECRET_KEY
  if (!key) throw new PaymentProviderError('FLUTTERWAVE_SECRET_KEY is not set', 'flutterwave')
  return key
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
  const body = await response.json().catch(() => null) as { status?: string; message?: string; data?: T } | null
  if (!response.ok || body?.status !== 'success') {
    throw new PaymentProviderError(body?.message || `Flutterwave request failed (${response.status})`, 'flutterwave', response.status)
  }
  return body.data as T
}

interface FlutterwaveTransaction {
  id: number
  tx_ref: string
  status: string
  amount: number
  currency: string
  created_at?: string
  processor_response?: string
  customer?: { id?: number }
}

export const flutterwaveProvider: PaymentProvider = {
  id: 'flutterwave',

  async createCheckout(request: CheckoutRequest): Promise<CheckoutResult> {
    const data = await call<{ link: string }>('/payments', {
      method: 'POST',
      body: JSON.stringify({
        tx_ref: request.reference,
        amount: request.amount,
        currency: request.currency,
        redirect_url: request.callbackUrl,
        customer: { email: request.email },
        // Not card-only: mobile money first where that is how people pay (Ghana, Kenya,
        // Uganda, Francophone Africa…), bank transfer / USSD / wallets for USD.
        payment_options: flutterwavePaymentOptions(request.currency),
        meta: request.metadata,
        customizations: { title: 'NucleusArt', description: 'Ideas into Reality' },
      }),
    })
    return { authorizationUrl: data.link }
  },

  async verify(reference: string): Promise<VerifiedPayment> {
    // Flutterwave verifies by its own id, so resolve our tx_ref to a transaction first.
    let data: FlutterwaveTransaction
    try {
      data = await call<FlutterwaveTransaction>(
        `/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`,
      )
    } catch (error) {
      // No transaction yet means the customer opened checkout but has not paid (or left):
      // that is "pending", not an error — returning from Flutterwave used to show a failure.
      if (error instanceof PaymentProviderError && /no transaction was found/i.test(error.message)) {
        return { reference, status: 'pending', amount: 0, currency: 'USD', paidAt: null, failureReason: 'not_paid_yet' }
      }
      throw error
    }

    return {
      reference,
      status: data.status === 'successful' ? 'success' : data.status === 'failed' ? 'failed' : 'pending',
      amount: data.amount,
      currency: data.currency,
      paidAt: data.created_at ? new Date(data.created_at) : null,
      customerId: data.customer?.id ? String(data.customer.id) : undefined,
      failureReason: data.status === 'successful' ? undefined : data.processor_response,
    }
  },

  verifyWebhookSignature(rawBody: string, headers: Record<string, string | null>): boolean {
    const given = headers['verif-hash']
    const secret = process.env.FLUTTERWAVE_WEBHOOK_HASH
    if (!given || !secret) return false
    const a = Buffer.from(given, 'utf8')
    const b = Buffer.from(secret, 'utf8')
    return a.length === b.length && timingSafeEqual(a, b)
  },

  extractReference(payload: unknown): string | null {
    const event = payload as { event?: string; data?: { tx_ref?: string } } | null
    if (!event?.event?.startsWith('charge.')) return null
    return typeof event.data?.tx_ref === 'string' ? event.data.tx_ref : null
  },
}


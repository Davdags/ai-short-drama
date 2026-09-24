import { createHmac, timingSafeEqual } from 'node:crypto'
import {
  PaymentProviderError,
  type CheckoutRequest,
  type CheckoutResult,
  type PaymentProvider,
  type VerifiedPayment,
} from './types'

/**
 * Paystack — used for Nigerian Naira. Amounts go over the wire in kobo (minor units).
 * Docs: https://paystack.com/docs/api/transaction/
 */
const BASE_URL = 'https://api.paystack.co'

function secretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY
  if (!key) throw new PaymentProviderError('PAYSTACK_SECRET_KEY is not set', 'paystack')
  return key
}

/** Zero-decimal currencies would break this; Paystack's supported set all use 2 decimals. */
function toMinorUnits(amount: number): number {
  return Math.round(amount * 100)
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
  const body = await response.json().catch(() => null) as { status?: boolean; message?: string; data?: T } | null
  if (!response.ok || !body?.status) {
    throw new PaymentProviderError(body?.message || `Paystack request failed (${response.status})`, 'paystack', response.status)
  }
  return body.data as T
}

export const paystackProvider: PaymentProvider = {
  id: 'paystack',

  async createCheckout(request: CheckoutRequest): Promise<CheckoutResult> {
    const data = await call<{ authorization_url: string; reference: string }>('/transaction/initialize', {
      method: 'POST',
      body: JSON.stringify({
        email: request.email,
        amount: toMinorUnits(request.amount),
        currency: request.currency,
        reference: request.reference,
        callback_url: request.callbackUrl,
        // Card, bank, bank transfer, USSD and QR — Nigerians pay very differently from card-first markets.
        channels: ['card', 'bank', 'bank_transfer', 'ussd', 'qr', 'mobile_money', 'apple_pay'],
        metadata: request.metadata,
      }),
    })
    return { authorizationUrl: data.authorization_url, providerRef: data.reference }
  },

  async verify(reference: string): Promise<VerifiedPayment> {
    const data = await call<{
      status: string
      amount: number
      currency: string
      paid_at: string | null
      gateway_response?: string
      customer?: { customer_code?: string }
    }>(`/transaction/verify/${encodeURIComponent(reference)}`)

    return {
      reference,
      status: data.status === 'success' ? 'success' : data.status === 'failed' ? 'failed' : 'pending',
      amount: data.amount / 100,
      currency: data.currency,
      paidAt: data.paid_at ? new Date(data.paid_at) : null,
      customerId: data.customer?.customer_code,
      failureReason: data.status === 'success' ? undefined : data.gateway_response,
    }
  },

  verifyWebhookSignature(rawBody: string, headers: Record<string, string | null>): boolean {
    const signature = headers['x-paystack-signature']
    if (!signature) return false
    const expected = createHmac('sha512', secretKey()).update(rawBody).digest('hex')
    const given = Buffer.from(signature, 'utf8')
    const mine = Buffer.from(expected, 'utf8')
    // Length must match before timingSafeEqual, which throws on differing sizes.
    return given.length === mine.length && timingSafeEqual(given, mine)
  },

  extractReference(payload: unknown): string | null {
    const event = payload as { event?: string; data?: { reference?: string } } | null
    if (!event?.event?.startsWith('charge.')) return null
    return typeof event.data?.reference === 'string' ? event.data.reference : null
  },
}

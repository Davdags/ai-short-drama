/**
 * Payment provider contract. Paystack handles Nigerian Naira; USD goes to Whop (card) or
 * Flutterwave (bank transfer, mobile money, …), so all implement the same shape.
 */

export type ProviderId = 'paystack' | 'flutterwave' | 'whop'
export type PaymentPurpose = 'subscription' | 'credit_pack'

export interface CheckoutRequest {
  /** Our own reference; becomes Payment.providerRef so webhooks are idempotent. */
  reference: string
  email: string
  /** Minor units are handled inside each provider — pass the human amount. */
  amount: number
  currency: string
  /** Where the customer lands after paying. */
  callbackUrl: string
  metadata: Record<string, unknown>
}

export interface CheckoutResult {
  /** Where to send the customer to pay. */
  authorizationUrl: string
  /** The provider's own reference, when it differs from ours. */
  providerRef?: string
}

export interface VerifiedPayment {
  reference: string
  status: 'success' | 'failed' | 'pending'
  amount: number
  currency: string
  paidAt: Date | null
  /** Provider's customer id, kept so renewals can be matched back to a user. */
  customerId?: string
  failureReason?: string
}

export interface PaymentProvider {
  readonly id: ProviderId
  /** Starts a checkout and returns where to send the customer. */
  createCheckout(request: CheckoutRequest): Promise<CheckoutResult>
  /**
   * Confirms a payment with the provider — never trust the webhook body alone.
   * checkoutId is CheckoutResult.providerRef, for providers that look payments up by it.
   */
  verify(reference: string, checkoutId?: string | null): Promise<VerifiedPayment>
  /** True when the raw webhook body carries a valid signature from this provider. */
  verifyWebhookSignature(rawBody: string, headers: Record<string, string | null>): boolean
  /** Pulls our reference out of a webhook payload, or null when it is not a payment event. */
  extractReference(payload: unknown): string | null
}

export class PaymentProviderError extends Error {
  constructor(message: string, readonly provider: ProviderId, readonly status?: number) {
    super(message)
    this.name = 'PaymentProviderError'
  }
}

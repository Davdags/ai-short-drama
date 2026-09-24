import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-errors'
import { createScopedLogger } from '@/lib/logging/core'
import { providerById } from '@/lib/payments'
import { settlePayment } from '@/lib/payments/service'

const logger = createScopedLogger({ module: 'payments' })

/**
 * POST /api/billing/webhook/paystack | /api/billing/webhook/flutterwave
 *
 * Public by necessity — the provider calls it, not a signed-in user. Every request is
 * rejected unless it carries a valid signature, and the amount is always re-checked with
 * the provider before anything is granted.
 */
export const POST = apiHandler(async (
  request: NextRequest,
  context: { params: Promise<{ provider: string }> },
) => {
  const { provider: providerId } = await context.params
  const provider = providerById(providerId)
  if (!provider) return NextResponse.json({ received: false }, { status: 404 })

  // The raw body is required: signatures are computed over the exact bytes sent.
  const rawBody = await request.text()
  const headers: Record<string, string | null> = {
    'x-paystack-signature': request.headers.get('x-paystack-signature'),
    'verif-hash': request.headers.get('verif-hash'),
  }

  if (!provider.verifyWebhookSignature(rawBody, headers)) {
    logger.warn({ message: 'webhook signature rejected', details: { provider: provider.id } })
    return NextResponse.json({ received: false }, { status: 401 })
  }

  const payload = JSON.parse(rawBody) as unknown
  const reference = provider.extractReference(payload)
  if (!reference) {
    // Not a payment event (refund, transfer, etc.) — acknowledge so it is not retried.
    return NextResponse.json({ received: true, ignored: true })
  }

  // Never trust the webhook body for amounts; ask the provider what really happened.
  const verified = await provider.verify(reference)
  const result = await settlePayment({ providerRef: reference, provider: provider.id, verified })

  logger.info({
    message: 'webhook processed',
    details: { provider: provider.id, reference, applied: result.applied, reason: result.reason },
  })
  return NextResponse.json({ received: true, applied: result.applied })
})

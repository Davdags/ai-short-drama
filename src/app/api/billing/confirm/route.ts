import { NextRequest, NextResponse } from 'next/server'
import { apiHandler, ApiError } from '@/lib/api-errors'
import { isErrorResponse, requireUserAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { providerById } from '@/lib/payments'
import { settlePayment } from '@/lib/payments/service'

/**
 * POST /api/billing/confirm  { reference }
 *
 * Confirms a payment by asking the provider directly, for setups without webhooks.
 * Called when the customer returns from checkout. The sweep in scripts/reconcile-payments.ts
 * covers anyone who closes the tab before landing back here.
 */
export const POST = apiHandler(async (request: NextRequest) => {
  const authResult = await requireUserAuth()
  if (isErrorResponse(authResult)) return authResult
  const userId = authResult.session.user.id

  const body = await request.json().catch(() => null) as { reference?: unknown } | null
  const reference = typeof body?.reference === 'string' ? body.reference.trim() : ''
  if (!reference) throw new ApiError('INVALID_PARAMS', { field: 'reference', reason: 'required' })

  const payment = await prisma.payment.findUnique({
    where: { providerRef: reference },
    select: { userId: true, provider: true, status: true, planId: true, purpose: true, providerCheckoutId: true },
  })
  if (!payment) throw new ApiError('NOT_FOUND', { resource: 'payment' })
  // Only the payer may ask about their own payment.
  if (payment.userId !== userId) throw new ApiError('FORBIDDEN')

  if (payment.status === 'success') {
    return NextResponse.json({ success: true, status: 'success', planId: payment.planId, purpose: payment.purpose, alreadySettled: true })
  }

  const provider = providerById(payment.provider)
  if (!provider) throw new ApiError('MISSING_CONFIG', { reason: 'unknown_provider' })

  const verified = await provider.verify(reference, payment.providerCheckoutId)
  const result = await settlePayment({ providerRef: reference, provider: provider.id, verified })

  return NextResponse.json({
    success: true,
    status: verified.status,
    planId: payment.planId,
    purpose: payment.purpose,
    applied: result.applied,
    reason: result.reason,
  })
})

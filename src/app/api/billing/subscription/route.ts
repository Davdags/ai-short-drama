import { NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-errors'
import { isErrorResponse, requireUserAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { getActiveSubscription } from '@/lib/payments/service'
import { PLAN_MONTHLY_CREDITS } from '@/lib/billing/plan-limits'

/**
 * GET /api/billing/subscription
 * The customer's current plan, renewal date and recent payments, for the account page.
 */
export const GET = apiHandler(async () => {
  const authResult = await requireUserAuth()
  if (isErrorResponse(authResult)) return authResult
  const userId = authResult.session.user.id

  const [subscription, payments] = await Promise.all([
    getActiveSubscription(userId),
    prisma.payment.findMany({
      where: { userId, status: 'success' },
      orderBy: { paidAt: 'desc' },
      take: 12,
      select: { providerRef: true, amount: true, currency: true, planId: true, cycle: true, paidAt: true, creditsGranted: true },
    }),
  ])

  return NextResponse.json({
    success: true,
    subscription: subscription && {
      planId: subscription.planId,
      cycle: subscription.cycle,
      status: subscription.status,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      monthlyCredits: PLAN_MONTHLY_CREDITS[subscription.planId as keyof typeof PLAN_MONTHLY_CREDITS] ?? 0,
    },
    planId: subscription?.planId ?? 'free',
    payments: payments.map((payment) => ({
      reference: payment.providerRef,
      amount: Number(payment.amount),
      currency: payment.currency,
      planId: payment.planId,
      cycle: payment.cycle,
      paidAt: payment.paidAt,
      creditsGranted: payment.creditsGranted,
    })),
  })
})

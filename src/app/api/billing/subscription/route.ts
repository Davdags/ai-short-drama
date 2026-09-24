import { NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-errors'
import { isErrorResponse, requireUserAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { getActiveSubscription } from '@/lib/payments/service'
import { PLAN_MONTHLY_CREDITS, getUserPlanId } from '@/lib/billing/plan-limits'
import { TOP_UP_CREDITS_PER_USD, isTopUpPlan } from '@/lib/billing/top-up'

/**
 * GET /api/billing/subscription
 * The customer's current plan, renewal date and recent payments, for the account page,
 * plus whether they can top up and at what rate (the same plan checkout prices it from).
 */
export const GET = apiHandler(async () => {
  const authResult = await requireUserAuth()
  if (isErrorResponse(authResult)) return authResult
  const userId = authResult.session.user.id

  const [subscription, effectivePlan, payments] = await Promise.all([
    getActiveSubscription(userId),
    getUserPlanId(userId),
    prisma.payment.findMany({
      where: { userId, status: 'success' },
      orderBy: { paidAt: 'desc' },
      take: 12,
      select: { providerRef: true, purpose: true, amount: true, currency: true, planId: true, cycle: true, paidAt: true, creditsGranted: true },
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
    topUp: isTopUpPlan(effectivePlan)
      ? { planId: effectivePlan, creditsPerUsd: TOP_UP_CREDITS_PER_USD[effectivePlan] }
      : null,
    payments: payments.map((payment) => ({
      reference: payment.providerRef,
      purpose: payment.purpose,
      amount: Number(payment.amount),
      currency: payment.currency,
      planId: payment.planId,
      cycle: payment.cycle,
      paidAt: payment.paidAt,
      creditsGranted: payment.creditsGranted,
    })),
  })
})

import { randomUUID } from 'node:crypto'
import { prisma } from '@/lib/prisma'
import { createScopedLogger } from '@/lib/logging/core'
import { addBalance } from '@/lib/billing/ledger'
import { PLAN_MONTHLY_CREDITS, type PlanId } from '@/lib/billing/plan-limits'
import { recordAffiliateCommission } from '@/lib/affiliate/service'
import { sendPaymentReceiptEmail, sendTopUpReceiptEmail } from '@/lib/email/billing-emails'
import { topUpCredits } from '@/lib/billing/top-up'
import { upgradeTrialDefaultsAfterPayment } from '@/lib/providers/evolink/platform-defaults'
import type { ProviderId } from './index'
import type { VerifiedPayment } from './types'

const logger = createScopedLogger({ module: 'payments' })

/** Yearly plans are billed once but grant their credits month by month. */
export type BillingCycle = 'monthly' | 'yearly'

export function isPaidPlan(planId: string): planId is Exclude<PlanId, 'free'> {
  return planId === 'starter' || planId === 'pro' || planId === 'studio'
}

/** Our own payment reference. Prefixed so it is recognisable in provider dashboards. */
export function newPaymentReference(): string {
  return `na_${randomUUID().replace(/-/g, '')}`
}

function periodEnd(from: Date, cycle: BillingCycle): Date {
  const end = new Date(from)
  if (cycle === 'yearly') end.setFullYear(end.getFullYear() + 1)
  else end.setMonth(end.getMonth() + 1)
  return end
}

/**
 * Applies a confirmed payment: marks it paid, activates the plan, grants credits and
 * records affiliate commission. Safe to call twice — a payment already marked success
 * returns without granting anything again, so replayed webhooks cannot double-credit.
 */
export async function settlePayment(input: {
  providerRef: string
  provider: ProviderId
  verified: VerifiedPayment
}): Promise<{ applied: boolean; reason?: string }> {
  const payment = await prisma.payment.findUnique({ where: { providerRef: input.providerRef } })
  if (!payment) return { applied: false, reason: 'unknown_reference' }
  if (payment.status === 'success') return { applied: false, reason: 'already_settled' }

  if (input.verified.status !== 'success') {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: input.verified.status === 'failed' ? 'failed' : 'pending',
        failureReason: input.verified.failureReason?.slice(0, 255) ?? null,
      },
    })
    return { applied: false, reason: `provider_status_${input.verified.status}` }
  }

  // Trust the provider's amount, not the client's — the customer could have tampered with it.
  const amount = input.verified.amount
  const currency = input.verified.currency.toUpperCase()

  // A top-up grants credits for its full price, so an underpaid one must not settle.
  const isTopUp = payment.purpose === 'credit_pack'
  const expected = Number(payment.amount)
  if (isTopUp && currency === payment.currency.toUpperCase() && amount + 0.01 < expected) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'failed', failureReason: `amount_mismatch: paid ${amount} of ${expected} ${currency}` },
    })
    logger.error({ message: 'top-up underpaid', details: { paymentRef: payment.providerRef, amount, expected, currency } })
    return { applied: false, reason: 'amount_mismatch' }
  }

  // Local-currency payments keep the USD plan price recorded at checkout (the exchange
  // rate used then), so commissions and reports stay in dollars.
  const amountUsd = currency === 'USD' ? Number(amount.toFixed(2)) : Number(payment.amountUsd)
  const paidAt = input.verified.paidAt ?? new Date()

  const planId = payment.planId
  const cycle = (payment.cycle as BillingCycle | null) ?? 'monthly'
  // Top-up credits come from the dollar price and the plan rate recorded at checkout.
  const credits = isTopUp
    ? topUpCredits(planId, Number(payment.amountUsd))
    : planId && isPaidPlan(planId) ? PLAN_MONTHLY_CREDITS[planId] : 0

  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: 'success', amount, currency, amountUsd, paidAt, creditsGranted: credits },
  })

  let periodEnd: Date | null = null
  if (payment.purpose === 'subscription' && planId && isPaidPlan(planId)) {
    periodEnd = await activateSubscription({
      userId: payment.userId,
      planId,
      cycle,
      provider: input.provider,
      providerCustomerId: input.verified.customerId,
      startedAt: paidAt,
    })
  }

  if (credits > 0) {
    await addBalance(payment.userId, credits, {
      type: 'recharge',
      reason: isTopUp ? `credit top-up ($${Number(payment.amountUsd)})` : `${planId} plan (${cycle})`,
      operatorId: `payment:${input.provider}`,
    })
  }

  // Paying customers write with Opus 5.5 instead of the free-trial model.
  await upgradeTrialDefaultsAfterPayment(payment.userId)

  // Commission is on what we actually collected, in USD.
  try {
    await recordAffiliateCommission({
      referredUserId: payment.userId,
      paymentRef: payment.providerRef,
      amountUsd,
      paidAt,
    })
  } catch (error) {
    // A commission failure must never undo a customer's paid plan.
    logger.error({
      message: 'affiliate commission failed',
      details: { paymentRef: payment.providerRef, error: error instanceof Error ? error.message : String(error) },
    })
  }

  if (isTopUp) {
    await sendTopUpReceiptEmail({ userId: payment.userId, reference: payment.providerRef, amount, currency, credits })
  } else if (periodEnd && planId) {
    await sendPaymentReceiptEmail({
      userId: payment.userId,
      reference: payment.providerRef,
      planId,
      cycle,
      amount,
      currency,
      credits,
      periodEnd,
    })
  }

  logger.info({
    message: 'payment settled',
    details: { paymentRef: payment.providerRef, provider: input.provider, planId, credits, amountUsd },
  })
  return { applied: true }
}

/** Starts or extends a plan. Any earlier active row is superseded. */
export async function activateSubscription(input: {
  userId: string
  planId: Exclude<PlanId, 'free'>
  cycle: BillingCycle
  provider: ProviderId
  providerCustomerId?: string
  providerSubscriptionId?: string
  startedAt: Date
}): Promise<Date> {
  const end = periodEnd(input.startedAt, input.cycle)

  await prisma.$transaction(async (tx) => {
    await tx.subscription.updateMany({
      where: { userId: input.userId, status: 'active' },
      data: { status: 'expired' },
    })
    await tx.subscription.create({
      data: {
        userId: input.userId,
        planId: input.planId,
        cycle: input.cycle,
        status: 'active',
        provider: input.provider,
        providerCustomerId: input.providerCustomerId ?? null,
        providerSubscriptionId: input.providerSubscriptionId ?? null,
        currentPeriodStart: input.startedAt,
        currentPeriodEnd: end,
        creditsGrantedFor: input.startedAt,
      },
    })
  })

  return end
}

/** The plan a user is actually on right now, or null when they are on free. */
export async function getActiveSubscription(userId: string) {
  return prisma.subscription.findFirst({
    where: { userId, status: 'active', currentPeriodEnd: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  })
}

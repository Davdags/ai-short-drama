/**
 * Keeps subscriptions honest between payments. Run daily.
 *
 *   npx tsx --env-file=.env scripts/process-subscriptions.ts
 *
 * Three jobs:
 *  1. Yearly plans are paid once but earn credits every month — drip them monthly.
 *  2. Warn a few days before a plan lapses (we never auto-charge a card).
 *  3. Expire plans past their end date and drop the customer back to Free.
 */
import { PrismaClient } from '@prisma/client'
import { addBalance } from '../src/lib/billing/ledger'
import { PLAN_MONTHLY_CREDITS, type PlanId } from '../src/lib/billing/plan-limits'
import { sendPlanExpiredEmail, sendRenewalReminderEmail } from '../src/lib/email/billing-emails'

const prisma = new PrismaClient()

/** Warn this many days before the plan ends. */
const REMIND_DAYS_BEFORE = 3
const DAY_MS = 86_400_000

function monthsBetween(from: Date, to: Date): number {
  const months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth())
  // Only count a month once its day-of-month has been reached.
  return to.getDate() >= from.getDate() ? months : months - 1
}

/** Yearly subscribers get their monthly allowance dripped, not all at once. */
async function dripYearlyCredits(now: Date): Promise<number> {
  const subscriptions = await prisma.subscription.findMany({
    where: { status: 'active', cycle: 'yearly', currentPeriodEnd: { gt: now } },
    select: { id: true, userId: true, planId: true, currentPeriodStart: true, creditsGrantedFor: true },
  })

  let granted = 0
  for (const subscription of subscriptions) {
    const lastGrant = subscription.creditsGrantedFor ?? subscription.currentPeriodStart
    if (monthsBetween(lastGrant, now) < 1) continue

    const credits = PLAN_MONTHLY_CREDITS[subscription.planId as PlanId] ?? 0
    if (credits <= 0) continue

    // Advance exactly one month per run so a long gap cannot grant a lump sum.
    const nextGrant = new Date(lastGrant)
    nextGrant.setMonth(nextGrant.getMonth() + 1)

    await addBalance(subscription.userId, credits, {
      type: 'recharge',
      reason: `${subscription.planId} yearly — monthly credits`,
      operatorId: 'scheduler:subscriptions',
    })
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { creditsGrantedFor: nextGrant },
    })

    granted += 1
    console.log(`granted ${credits} credits to ${subscription.userId} (${subscription.planId} yearly)`)
  }
  return granted
}

/** We do not auto-charge, so tell people before their plan lapses. */
async function remindBeforeExpiry(now: Date): Promise<number> {
  const windowEnd = new Date(now.getTime() + REMIND_DAYS_BEFORE * DAY_MS)
  const subscriptions = await prisma.subscription.findMany({
    where: { status: 'active', currentPeriodEnd: { gt: now, lte: windowEnd } },
    select: { id: true, userId: true, planId: true, currentPeriodEnd: true },
  })

  for (const subscription of subscriptions) {
    const daysLeft = Math.max(1, Math.ceil((subscription.currentPeriodEnd.getTime() - now.getTime()) / DAY_MS))
    // sendOnce dedupes on the subscription id, so repeated runs send one reminder.
    await sendRenewalReminderEmail({
      userId: subscription.userId,
      subscriptionId: subscription.id,
      planId: subscription.planId,
      periodEnd: subscription.currentPeriodEnd,
      daysLeft,
    })
  }
  return subscriptions.length
}

/** Past the end date the plan stops; credits already granted stay with the customer. */
async function expireFinished(now: Date): Promise<number> {
  const subscriptions = await prisma.subscription.findMany({
    where: { status: 'active', currentPeriodEnd: { lte: now } },
    select: { id: true, userId: true, planId: true },
  })

  for (const subscription of subscriptions) {
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: 'expired' },
    })
    await sendPlanExpiredEmail({
      userId: subscription.userId,
      subscriptionId: subscription.id,
      planId: subscription.planId,
    })
    console.log(`expired ${subscription.planId} for ${subscription.userId}`)
  }
  return subscriptions.length
}

async function main() {
  const now = new Date()
  const dripped = await dripYearlyCredits(now)
  const reminded = await remindBeforeExpiry(now)
  const expired = await expireFinished(now)
  console.log(`done — ${dripped} credit grants, ${reminded} reminders, ${expired} expired`)
}

main()
  .catch((error) => { console.error('subscription job failed:', error); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())

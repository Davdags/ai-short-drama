import { prisma } from '@/lib/prisma'
import { toMoneyNumber } from '@/lib/billing/money'
import { CREDITS_PER_EVOLINK_CREDIT } from '@/lib/billing/cost'
import { PLANS } from '@/app/[locale]/pricing/plans'

/** What one EvoLink credit costs us in USD (EvoLink top-up rate). */
export const EVOLINK_CREDIT_USD = 0.0147

const DAY_MS = 24 * 60 * 60 * 1000
const PAID_PLAN_IDS = ['starter', 'pro', 'studio'] as const
type PaidPlanId = (typeof PAID_PLAN_IDS)[number]

export interface SubscriptionRow {
  userId: string
  planId: string
  cycle: string
  createdAt: Date
  currentPeriodEnd: Date
}

export interface PaymentRow {
  userId: string
  purpose: string
  provider: string
  amountUsd: number
  paidAt: Date
}

const round2 = (value: number) => Math.round(value * 100) / 100

/** Monthly recurring value of one subscription in USD: list price, yearly plans spread over 12 months. */
export function monthlyValueUsd(planId: string, cycle: string): number {
  const plan = PLANS.find((p) => p.id === planId)
  if (!plan) return 0
  return cycle === 'yearly' ? plan.yearlyPrice / 12 : plan.monthlyPrice
}

/** One subscription per user: the one that ends last (renewals create a new row). */
export function latestPerUser(rows: SubscriptionRow[]): SubscriptionRow[] {
  const byUser = new Map<string, SubscriptionRow>()
  for (const row of rows) {
    const current = byUser.get(row.userId)
    if (!current || row.currentPeriodEnd > current.currentPeriodEnd) byUser.set(row.userId, row)
  }
  return [...byUser.values()]
}

export function summarizeSubscriptions(active: SubscriptionRow[]) {
  const byPlan = Object.fromEntries(PAID_PLAN_IDS.map((id) => [id, { count: 0, mrr: 0 }])) as Record<PaidPlanId, { count: number; mrr: number }>
  let mrr = 0
  let yearly = 0
  for (const sub of active) {
    const value = monthlyValueUsd(sub.planId, sub.cycle)
    if (value <= 0) continue
    mrr += value
    if (sub.cycle === 'yearly') yearly++
    const bucket = byPlan[sub.planId as PaidPlanId]
    if (bucket) {
      bucket.count++
      bucket.mrr = round2(bucket.mrr + value)
    }
  }
  const subscribers = PAID_PLAN_IDS.reduce((sum, id) => sum + byPlan[id].count, 0)
  return {
    mrr: round2(mrr),
    arr: round2(mrr * 12),
    subscribers,
    monthly: subscribers - yearly,
    yearly,
    arpu: subscribers ? round2(mrr / subscribers) : 0,
    byPlan,
  }
}

export function sumPayments(payments: PaymentRow[], since?: Date) {
  let total = 0
  let subscriptions = 0
  let topUps = 0
  let count = 0
  for (const p of payments) {
    if (since && p.paidAt < since) continue
    count++
    total += p.amountUsd
    if (p.purpose === 'credit_pack') topUps += p.amountUsd
    else subscriptions += p.amountUsd
  }
  return { total: round2(total), subscriptions: round2(subscriptions), topUps: round2(topUps), count }
}

/** Revenue per calendar month (UTC), oldest first, including months with no sales. */
export function revenueByMonth(payments: PaymentRow[], now: Date, months = 6) {
  const out: Array<{ month: string; total: number }> = []
  for (let i = months - 1; i >= 0; i--) {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i + 1, 1))
    const total = payments.filter((p) => p.paidAt >= start && p.paidAt < end).reduce((sum, p) => sum + p.amountUsd, 0)
    out.push({ month: start.toISOString().slice(0, 7), total: round2(total) })
  }
  return out
}

/** New and lost subscribers in the window: a user is churned if a paid plan ended and they have no active plan now. */
export function subscriberMovement(allPaid: SubscriptionRow[], activeUserIds: Set<string>, since: Date, now: Date) {
  const newSubs = latestPerUser(allPaid.filter((s) => s.createdAt >= since && activeUserIds.has(s.userId)))
  const firstSubByUser = new Map<string, Date>()
  for (const s of allPaid) {
    const first = firstSubByUser.get(s.userId)
    if (!first || s.createdAt < first) firstSubByUser.set(s.userId, s.createdAt)
  }
  const brandNew = newSubs.filter((s) => (firstSubByUser.get(s.userId) ?? s.createdAt) >= since)
  const churned = latestPerUser(allPaid.filter((s) => !activeUserIds.has(s.userId)))
    .filter((s) => s.currentPeriodEnd >= since && s.currentPeriodEnd <= now)
  return {
    newSubscribers: brandNew.length,
    newMrr: round2(brandNew.reduce((sum, s) => sum + monthlyValueUsd(s.planId, s.cycle), 0)),
    churnedSubscribers: churned.length,
    churnedMrr: round2(churned.reduce((sum, s) => sum + monthlyValueUsd(s.planId, s.cycle), 0)),
  }
}

/** Everything the admin money section shows, in USD. */
export async function loadRevenueMetrics(now = new Date()) {
  const since = (days: number) => new Date(now.getTime() - days * DAY_MS)
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const [subRows, paymentRows, failed30d, usage30d, commissions] = await Promise.all([
    prisma.subscription.findMany({
      where: { planId: { in: [...PAID_PLAN_IDS] } },
      select: { userId: true, planId: true, cycle: true, status: true, createdAt: true, currentPeriodEnd: true },
    }),
    prisma.payment.findMany({
      where: { status: 'success' },
      select: { userId: true, purpose: true, provider: true, amountUsd: true, paidAt: true, createdAt: true },
    }),
    prisma.payment.count({ where: { status: { in: ['failed', 'pending'] }, createdAt: { gte: since(30) } } }),
    prisma.usageCost.aggregate({ where: { createdAt: { gte: since(30) } }, _sum: { cost: true } }),
    prisma.affiliateCommission.groupBy({ by: ['status'], _sum: { amountUsd: true } }),
  ])

  const allPaid: SubscriptionRow[] = subRows.map((s) => ({ userId: s.userId, planId: s.planId, cycle: s.cycle, createdAt: s.createdAt, currentPeriodEnd: s.currentPeriodEnd }))
  const active = latestPerUser(subRows.filter((s) => s.status === 'active' && s.currentPeriodEnd > now))
  const payments: PaymentRow[] = paymentRows.map((p) => ({
    userId: p.userId,
    purpose: p.purpose,
    provider: p.provider,
    amountUsd: toMoneyNumber(p.amountUsd),
    paidAt: p.paidAt ?? p.createdAt,
  }))

  const revenue30d = sumPayments(payments, since(30))
  const evolinkCost30d = round2((toMoneyNumber(usage30d._sum.cost) / CREDITS_PER_EVOLINK_CREDIT) * EVOLINK_CREDIT_USD)
  const commissionBy = (status: string) => round2(toMoneyNumber(commissions.find((c) => c.status === status)?._sum.amountUsd))
  const byProvider: Record<string, number> = {}
  for (const p of payments) byProvider[p.provider] = round2((byProvider[p.provider] ?? 0) + p.amountUsd)

  return {
    recurring: summarizeSubscriptions(active),
    revenue: {
      last24h: sumPayments(payments, since(1)),
      last7d: sumPayments(payments, since(7)),
      last30d: revenue30d,
      monthToDate: sumPayments(payments, monthStart),
      allTime: sumPayments(payments),
      byMonth: revenueByMonth(payments, now),
      byProvider,
    },
    customers: {
      payingAllTime: new Set(payments.map((p) => p.userId)).size,
      ...subscriberMovement(allPaid, new Set(active.map((s) => s.userId)), since(30), now),
      failedOrAbandonedPayments30d: failed30d,
    },
    costs: {
      evolinkCost30d,
      grossProfit30d: round2(revenue30d.total - evolinkCost30d),
      affiliateOwed: commissionBy('pending'),
      affiliatePaid: commissionBy('paid'),
    },
  }
}

export type RevenueMetrics = Awaited<ReturnType<typeof loadRevenueMetrics>>

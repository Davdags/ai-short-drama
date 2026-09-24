import { createHash } from 'crypto'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { toMoneyNumber } from '@/lib/billing/money'
import {
  commissionAvailableAt,
  defaultReferralCode,
  isValidReferralCode,
  nextTier,
  tierForRevenue,
} from './program'

const DAY_MS = 24 * 60 * 60 * 1000
const CLICK_DEDUPE_MS = DAY_MS
const REPORT_DAYS = 30
const LIST_LIMIT = 50

export const PAYOUT_METHODS = ['paypal', 'bank', 'crypto'] as const
export type PayoutMethod = typeof PAYOUT_METHODS[number]

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
}

export function hashVisitor(ip: string, userAgent: string): string {
  return createHash('sha256').update(`${ip}|${userAgent}`).digest('hex')
}

export async function findAffiliateByCode(code: string) {
  const normalized = code.trim().toLowerCase()
  if (!isValidReferralCode(normalized)) return null
  return await prisma.affiliate.findUnique({ where: { code: normalized } })
}

export async function getOrCreateAffiliate(userId: string, username: string) {
  const existing = await prisma.affiliate.findUnique({ where: { userId } })
  if (existing) return existing
  const code = defaultReferralCode(username, userId)
  try {
    return await prisma.affiliate.create({ data: { userId, code } })
  } catch (error) {
    if (!isUniqueViolation(error)) throw error
    // Either a concurrent request created it, or the default code is taken: fall back to the full id.
    const raced = await prisma.affiliate.findUnique({ where: { userId } })
    if (raced) return raced
    return await prisma.affiliate.create({ data: { userId, code: `${code}-${userId.replace(/-/g, '').slice(6, 12)}` } })
  }
}

/** Records a referral-link click (one per visitor per day). Returns false for unknown codes. */
export async function recordAffiliateClick(code: string, visitorHash: string): Promise<boolean> {
  const affiliate = await findAffiliateByCode(code)
  if (!affiliate) return false
  const recent = await prisma.affiliateClick.findFirst({
    where: { affiliateId: affiliate.id, visitorHash, createdAt: { gte: new Date(Date.now() - CLICK_DEDUPE_MS) } },
    select: { id: true },
  })
  if (!recent) {
    await prisma.affiliateClick.create({ data: { affiliateId: affiliate.id, visitorHash } })
  }
  return true
}

/** Links a newly created user to the affiliate whose code they arrived with. Never throws. */
export async function attributeReferral(referredUserId: string, code: string | null | undefined): Promise<boolean> {
  if (!code) return false
  try {
    const affiliate = await findAffiliateByCode(code)
    if (!affiliate || affiliate.userId === referredUserId) return false
    await prisma.affiliateReferral.create({ data: { affiliateId: affiliate.id, referredUserId } })
    return true
  } catch {
    // Already attributed (unique referredUserId) or a transient DB error: sign-up must still succeed.
    return false
  }
}

async function referredRevenueUsd(affiliateId: string): Promise<number> {
  const result = await prisma.affiliateCommission.aggregate({
    where: { affiliateId, status: { not: 'void' } },
    _sum: { paymentAmountUsd: true },
  })
  return toMoneyNumber(result._sum.paymentAmountUsd)
}

/**
 * Called for every successful customer payment (subscription or top-up).
 * Idempotent per paymentRef. Returns null when the customer wasn't referred.
 */
export async function recordAffiliateCommission(input: {
  referredUserId: string
  paymentRef: string
  amountUsd: number
  paidAt?: Date
}) {
  if (!Number.isFinite(input.amountUsd) || input.amountUsd <= 0) return null
  const referral = await prisma.affiliateReferral.findUnique({ where: { referredUserId: input.referredUserId } })
  if (!referral) return null

  const existing = await prisma.affiliateCommission.findUnique({ where: { paymentRef: input.paymentRef } })
  if (existing) return existing

  const tier = tierForRevenue(await referredRevenueUsd(referral.affiliateId))
  const paidAt = input.paidAt ?? new Date()
  try {
    return await prisma.affiliateCommission.create({
      data: {
        affiliateId: referral.affiliateId,
        referredUserId: input.referredUserId,
        paymentRef: input.paymentRef,
        paymentAmountUsd: round2(input.amountUsd),
        rate: tier.rate,
        amountUsd: round2(input.amountUsd * tier.rate),
        tier: tier.name,
        availableAt: commissionAvailableAt(paidAt),
        createdAt: paidAt,
      },
    })
  } catch (error) {
    if (!isUniqueViolation(error)) throw error
    return await prisma.affiliateCommission.findUnique({ where: { paymentRef: input.paymentRef } })
  }
}

/** Voids the commission for a refunded payment, unless it has already been paid out. */
export async function voidAffiliateCommission(paymentRef: string): Promise<boolean> {
  const result = await prisma.affiliateCommission.updateMany({
    where: { paymentRef, status: 'pending' },
    data: { status: 'void' },
  })
  return result.count > 0
}

function maskIdentity(user: { name: string; email: string | null } | undefined): string {
  const source = user?.email || user?.name || 'customer'
  const [local, domain] = source.split('@')
  const visible = local.slice(0, 2)
  return `${visible}${'•'.repeat(Math.max(3, local.length - 2))}${domain ? `@${domain}` : ''}`
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export async function getAffiliateDashboard(userId: string, username: string) {
  const affiliate = await getOrCreateAffiliate(userId, username)
  const now = Date.now()
  const reportSince = new Date(now - (REPORT_DAYS - 1) * DAY_MS)
  reportSince.setUTCHours(0, 0, 0, 0)

  const [clicks, referralCount, referrals, commissions, payouts, recentClicks, pendingSums, paidSum, revenueUsd] = await Promise.all([
    prisma.affiliateClick.count({ where: { affiliateId: affiliate.id } }),
    prisma.affiliateReferral.count({ where: { affiliateId: affiliate.id } }),
    prisma.affiliateReferral.findMany({ where: { affiliateId: affiliate.id }, orderBy: { createdAt: 'desc' }, take: LIST_LIMIT }),
    prisma.affiliateCommission.findMany({ where: { affiliateId: affiliate.id }, orderBy: { createdAt: 'desc' }, take: LIST_LIMIT }),
    prisma.affiliatePayout.findMany({ where: { affiliateId: affiliate.id }, orderBy: { paidAt: 'desc' }, take: LIST_LIMIT }),
    prisma.affiliateClick.findMany({ where: { affiliateId: affiliate.id, createdAt: { gte: reportSince } }, select: { createdAt: true } }),
    prisma.affiliateCommission.findMany({ where: { affiliateId: affiliate.id, status: 'pending' }, select: { amountUsd: true, availableAt: true } }),
    prisma.affiliatePayout.aggregate({ where: { affiliateId: affiliate.id }, _sum: { amountUsd: true } }),
    referredRevenueUsd(affiliate.id),
  ])

  const [customers, recentReferrals, recentCommissions] = await Promise.all([
    prisma.affiliateCommission.groupBy({
      by: ['referredUserId'],
      where: { affiliateId: affiliate.id, status: { not: 'void' } },
    }),
    prisma.affiliateReferral.findMany({ where: { affiliateId: affiliate.id, createdAt: { gte: reportSince } }, select: { createdAt: true } }),
    prisma.affiliateCommission.findMany({
      where: { affiliateId: affiliate.id, status: { not: 'void' }, createdAt: { gte: reportSince } },
      select: { createdAt: true, amountUsd: true },
    }),
  ])

  const userIds = [...new Set([...referrals.map((r) => r.referredUserId), ...commissions.map((c) => c.referredUserId)])]
  const users = userIds.length > 0
    ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, email: true } })
    : []
  const userById = new Map(users.map((user) => [user.id, user]))
  const payingIds = new Set(customers.map((c) => c.referredUserId))

  const dueSoonCutoff = now + 7 * DAY_MS
  let dueIn7DaysUsd = 0
  let totalUnpaidUsd = 0
  for (const row of pendingSums) {
    const amount = toMoneyNumber(row.amountUsd)
    totalUnpaidUsd += amount
    if (row.availableAt.getTime() <= dueSoonCutoff) dueIn7DaysUsd += amount
  }

  const days = Array.from({ length: REPORT_DAYS }, (_, index) => dayKey(new Date(reportSince.getTime() + index * DAY_MS)))
  const report = new Map(days.map((day) => [day, { day, clicks: 0, referrals: 0, earningsUsd: 0 }]))
  for (const click of recentClicks) {
    const bucket = report.get(dayKey(click.createdAt))
    if (bucket) bucket.clicks += 1
  }
  for (const referral of recentReferrals) {
    const bucket = report.get(dayKey(referral.createdAt))
    if (bucket) bucket.referrals += 1
  }
  for (const commission of recentCommissions) {
    const bucket = report.get(dayKey(commission.createdAt))
    if (bucket) bucket.earningsUsd = round2(bucket.earningsUsd + toMoneyNumber(commission.amountUsd))
  }

  const tier = tierForRevenue(revenueUsd)
  return {
    code: affiliate.code,
    payoutMethod: affiliate.payoutMethod,
    payoutDetails: affiliate.payoutDetails,
    tier,
    nextTier: nextTier(tier),
    revenueUsd: round2(revenueUsd),
    stats: {
      clicks,
      referrals: referralCount,
      customers: customers.length,
      dueIn7DaysUsd: round2(dueIn7DaysUsd),
      totalUnpaidUsd: round2(totalUnpaidUsd),
      totalPaidUsd: round2(toMoneyNumber(paidSum._sum.amountUsd)),
    },
    referrals: referrals.map((referral) => ({
      id: referral.id,
      customer: maskIdentity(userById.get(referral.referredUserId)),
      joinedAt: referral.createdAt.toISOString(),
      paying: payingIds.has(referral.referredUserId),
    })),
    commissions: commissions.map((commission) => ({
      id: commission.id,
      customer: maskIdentity(userById.get(commission.referredUserId)),
      paymentUsd: toMoneyNumber(commission.paymentAmountUsd),
      ratePercent: Math.round(toMoneyNumber(commission.rate) * 100),
      amountUsd: toMoneyNumber(commission.amountUsd),
      status: commission.status,
      availableAt: commission.availableAt.toISOString(),
      createdAt: commission.createdAt.toISOString(),
    })),
    payouts: payouts.map((payout) => ({
      id: payout.id,
      amountUsd: toMoneyNumber(payout.amountUsd),
      method: payout.method,
      reference: payout.reference,
      paidAt: payout.paidAt.toISOString(),
    })),
    report: [...report.values()],
  }
}

export type AffiliateDashboard = Awaited<ReturnType<typeof getAffiliateDashboard>>

export class AffiliateSettingsError extends Error {
  constructor(public readonly field: 'code' | 'payoutMethod' | 'payoutDetails', public readonly reason: string) {
    super(`${field}: ${reason}`)
  }
}

export async function updateAffiliateSettings(
  userId: string,
  username: string,
  input: { code?: unknown; payoutMethod?: unknown; payoutDetails?: unknown },
) {
  const affiliate = await getOrCreateAffiliate(userId, username)
  const data: Prisma.AffiliateUpdateInput = {}

  if (input.code !== undefined) {
    const code = typeof input.code === 'string' ? input.code.trim().toLowerCase() : ''
    if (!isValidReferralCode(code)) throw new AffiliateSettingsError('code', 'invalid')
    data.code = code
  }
  if (input.payoutMethod !== undefined) {
    if (!PAYOUT_METHODS.includes(input.payoutMethod as PayoutMethod)) throw new AffiliateSettingsError('payoutMethod', 'invalid')
    const details = typeof input.payoutDetails === 'string' ? input.payoutDetails.trim() : ''
    if (details.length < 3 || details.length > 1000) throw new AffiliateSettingsError('payoutDetails', 'invalid')
    data.payoutMethod = input.payoutMethod as PayoutMethod
    data.payoutDetails = details
  }

  try {
    return await prisma.affiliate.update({ where: { id: affiliate.id }, data })
  } catch (error) {
    if (isUniqueViolation(error)) throw new AffiliateSettingsError('code', 'taken')
    throw error
  }
}


import { NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-errors'
import { isErrorResponse } from '@/lib/api-auth'
import { requireAdminAuth } from '@/lib/admin/access'
import { prisma } from '@/lib/prisma'
import { toMoneyNumber } from '@/lib/billing/money'
import { CREDITS_PER_EVOLINK_CREDIT } from '@/lib/billing/cost'
import { listCentralEvolinkKeys } from '@/lib/providers/evolink/central'
import { fetchEvolinkBalance } from '@/lib/providers/evolink/balance-alert'

async function windowStats(since: Date) {
  const [signups, verified, charged, completed, failed, activeUsers] = await Promise.all([
    prisma.user.count({ where: { createdAt: { gte: since } } }),
    prisma.user.count({ where: { createdAt: { gte: since }, emailVerified: { not: null } } }),
    prisma.usageCost.aggregate({ where: { createdAt: { gte: since } }, _sum: { cost: true } }),
    prisma.task.count({ where: { status: 'completed', updatedAt: { gte: since } } }),
    prisma.task.count({ where: { status: 'failed', updatedAt: { gte: since } } }),
    prisma.task.findMany({ where: { createdAt: { gte: since } }, distinct: ['userId'], select: { userId: true } }),
  ])
  const creditsCharged = Math.round(toMoneyNumber(charged._sum.cost))
  return {
    signups,
    verified,
    creditsCharged,
    // What those credits cost you at EvoLink (5 NucleusArt credits = 1 EvoLink credit).
    evolinkCreditsUsed: Math.round(creditsCharged / CREDITS_PER_EVOLINK_CREDIT),
    completed,
    failed,
    activeUsers: activeUsers.length,
  }
}

/** GET /api/admin/summary — owner dashboard numbers. */
export const GET = apiHandler(async () => {
  const auth = await requireAdminAuth()
  if (isErrorResponse(auth)) return auth

  const day = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const week = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const key = listCentralEvolinkKeys()[0]
  const [last24h, last7d, totalUsers, verifiedUsers, suspended, balances, evolink] = await Promise.all([
    windowStats(day),
    windowStats(week),
    prisma.user.count(),
    prisma.user.count({ where: { emailVerified: { not: null } } }),
    prisma.user.count({ where: { suspendedAt: { not: null } } }),
    prisma.userBalance.aggregate({ _sum: { balance: true, totalSpent: true } }),
    key ? fetchEvolinkBalance(key).catch(() => null) : Promise.resolve(null),
  ])

  return NextResponse.json({
    success: true,
    last24h,
    last7d,
    users: { total: totalUsers, verified: verifiedUsers, suspended },
    credits: {
      outstanding: Math.round(toMoneyNumber(balances._sum.balance)),
      spentAllTime: Math.round(toMoneyNumber(balances._sum.totalSpent)),
    },
    evolink: evolink ? { accountCredits: Math.round(evolink.accountCredits) } : null,
  })
})

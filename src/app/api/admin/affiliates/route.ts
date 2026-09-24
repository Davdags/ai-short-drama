import { NextRequest, NextResponse } from 'next/server'
import { apiHandler, ApiError } from '@/lib/api-errors'
import { isErrorResponse } from '@/lib/api-auth'
import { requireAdminAuth } from '@/lib/admin/access'
import { prisma } from '@/lib/prisma'
import { toMoneyNumber } from '@/lib/billing/money'
import { AFFILIATE_PROGRAM } from '@/lib/affiliate/program'
import { logAuthAction } from '@/lib/logging/semantic'

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

/** GET /api/admin/affiliates — who is owed a payout right now. */
export const GET = apiHandler(async () => {
  const auth = await requireAdminAuth()
  if (isErrorResponse(auth)) return auth

  const now = new Date()
  const payable = await prisma.affiliateCommission.groupBy({
    by: ['affiliateId'],
    where: { status: 'pending', availableAt: { lte: now } },
    _sum: { amountUsd: true },
    _count: true,
  })
  const pendingLater = await prisma.affiliateCommission.groupBy({
    by: ['affiliateId'],
    where: { status: 'pending', availableAt: { gt: now } },
    _sum: { amountUsd: true },
  })
  const affiliates = await prisma.affiliate.findMany({
    where: { id: { in: [...new Set([...payable, ...pendingLater].map((row) => row.affiliateId))] } },
  })
  const users = await prisma.user.findMany({
    where: { id: { in: affiliates.map((affiliate) => affiliate.userId) } },
    select: { id: true, name: true, email: true },
  })

  const rows = affiliates.map((affiliate) => {
    const user = users.find((candidate) => candidate.id === affiliate.userId)
    const due = payable.find((row) => row.affiliateId === affiliate.id)
    const later = pendingLater.find((row) => row.affiliateId === affiliate.id)
    const dueUsd = round2(toMoneyNumber(due?._sum.amountUsd))
    return {
      affiliateId: affiliate.id,
      code: affiliate.code,
      user: user?.name || 'unknown',
      email: user?.email || null,
      dueUsd,
      commissions: due?._count ?? 0,
      notYetDueUsd: round2(toMoneyNumber(later?._sum.amountUsd)),
      payoutMethod: affiliate.payoutMethod,
      payoutDetails: affiliate.payoutDetails,
      readyToPay: dueUsd >= AFFILIATE_PROGRAM.minimumPayoutUsd && Boolean(affiliate.payoutMethod),
    }
  }).sort((a, b) => b.dueUsd - a.dueUsd)

  return NextResponse.json({ success: true, minimumPayoutUsd: AFFILIATE_PROGRAM.minimumPayoutUsd, affiliates: rows })
})

/**
 * POST /api/admin/affiliates  { affiliateId, reference? }
 * Records a payout you have already sent: marks the due commissions paid.
 */
export const POST = apiHandler(async (request: NextRequest) => {
  const auth = await requireAdminAuth()
  if (isErrorResponse(auth)) return auth

  const body = await request.json().catch(() => null) as { affiliateId?: unknown; reference?: unknown } | null
  const affiliateId = typeof body?.affiliateId === 'string' ? body.affiliateId : ''
  if (!affiliateId) throw new ApiError('INVALID_PARAMS', { field: 'affiliateId', reason: 'required' })
  const reference = typeof body?.reference === 'string' ? body.reference.trim().slice(0, 190) : ''

  const now = new Date()
  const payout = await prisma.$transaction(async (tx) => {
    const affiliate = await tx.affiliate.findUnique({ where: { id: affiliateId } })
    if (!affiliate) throw new ApiError('NOT_FOUND')
    const commissions = await tx.affiliateCommission.findMany({
      where: { affiliateId, status: 'pending', availableAt: { lte: now } },
      select: { id: true, amountUsd: true },
    })
    const amountUsd = round2(commissions.reduce((sum, row) => sum + toMoneyNumber(row.amountUsd), 0))
    if (amountUsd < AFFILIATE_PROGRAM.minimumPayoutUsd) {
      throw new ApiError('INVALID_PARAMS', { field: 'affiliateId', reason: 'belowMinimum' })
    }
    const created = await tx.affiliatePayout.create({
      data: { affiliateId, amountUsd, method: affiliate.payoutMethod, reference: reference || null, paidAt: now },
    })
    await tx.affiliateCommission.updateMany({
      where: { id: { in: commissions.map((row) => row.id) } },
      data: { status: 'paid', payoutId: created.id },
    })
    return { id: created.id, amountUsd }
  })

  logAuthAction('ADMIN_AFFILIATE_PAYOUT', auth.session.user.name || 'admin', { affiliateId, amountUsd: payout.amountUsd, reference })
  return NextResponse.json({ success: true, payout })
})

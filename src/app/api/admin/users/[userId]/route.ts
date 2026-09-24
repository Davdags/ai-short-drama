import { NextRequest, NextResponse } from 'next/server'
import { apiHandler, ApiError } from '@/lib/api-errors'
import { isErrorResponse } from '@/lib/api-auth'
import { clearSuspensionCache, isAdminUsername, requireAdminAuth } from '@/lib/admin/access'
import { prisma } from '@/lib/prisma'
import { addBalance, getBalance } from '@/lib/billing/ledger'
import { logAuthAction } from '@/lib/logging/semantic'

const MAX_GRANT = 1_000_000

/**
 * POST /api/admin/users/[userId]
 *   { action: "grantCredits", credits, reason? } | { action: "suspend" | "unsuspend" }
 */
export const POST = apiHandler(async (request: NextRequest, context: { params: Promise<{ userId: string }> }) => {
  const auth = await requireAdminAuth()
  if (isErrorResponse(auth)) return auth
  const { userId } = await context.params
  const body = await request.json().catch(() => null) as { action?: string; credits?: unknown; reason?: unknown } | null

  const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true } })
  if (!target) throw new ApiError('NOT_FOUND')

  if (body?.action === 'grantCredits') {
    const credits = Number(body.credits)
    if (!Number.isFinite(credits) || credits <= 0 || credits > MAX_GRANT) {
      throw new ApiError('INVALID_PARAMS', { field: 'credits', reason: 'invalid' })
    }
    const reason = typeof body.reason === 'string' && body.reason.trim() ? body.reason.trim().slice(0, 200) : 'admin grant'
    const granted = await addBalance(userId, credits, { type: 'adjust', reason, operatorId: auth.session.user.id })
    if (!granted) throw new ApiError('INTERNAL_ERROR')
    logAuthAction('ADMIN_GRANT_CREDITS', auth.session.user.name || 'admin', { userId, credits, reason })
    return NextResponse.json({ success: true, balance: (await getBalance(userId)).balance })
  }

  if (body?.action === 'suspend' || body?.action === 'unsuspend') {
    const suspend = body.action === 'suspend'
    if (suspend && isAdminUsername(target.name)) {
      throw new ApiError('INVALID_PARAMS', { field: 'action', reason: 'cannotSuspendAdmin' })
    }
    await prisma.user.update({ where: { id: userId }, data: { suspendedAt: suspend ? new Date() : null } })
    clearSuspensionCache(userId)
    logAuthAction(suspend ? 'ADMIN_SUSPEND_USER' : 'ADMIN_UNSUSPEND_USER', auth.session.user.name || 'admin', { userId })
    return NextResponse.json({ success: true, suspended: suspend })
  }

  throw new ApiError('INVALID_PARAMS', { field: 'action', reason: 'unknown' })
})

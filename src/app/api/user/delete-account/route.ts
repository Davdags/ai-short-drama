import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { apiHandler, ApiError } from '@/lib/api-errors'
import { isErrorResponse, requireUserAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { AUTH_PASSWORD_RESET_LIMIT, checkRateLimit } from '@/lib/rate-limit'
import { logAuthAction } from '@/lib/logging/semantic'

/**
 * POST /api/user/delete-account  { confirmUsername, password? }
 * Permanently deletes the account and everything linked to it (projects, assets, settings,
 * sessions). Billing records are kept for accounting, as the Privacy Policy states.
 * Accounts with a password must confirm it; Google-only accounts confirm their username.
 */
export const POST = apiHandler(async (request: NextRequest) => {
  const authResult = await requireUserAuth()
  if (isErrorResponse(authResult)) return authResult
  const userId = authResult.session.user.id

  const rate = await checkRateLimit('auth:delete-account', userId, AUTH_PASSWORD_RESET_LIMIT)
  if (rate.limited) {
    return NextResponse.json({ success: false, message: 'Too many attempts. Please try again later.' }, { status: 429 })
  }

  const body = await request.json().catch(() => null) as { confirmUsername?: unknown; password?: unknown } | null
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, password: true } })
  if (!user) throw new ApiError('NOT_FOUND')

  if (body?.confirmUsername !== user.name) {
    throw new ApiError('INVALID_PARAMS', { field: 'confirmUsername', reason: 'mismatch' })
  }
  if (user.password) {
    const password = typeof body?.password === 'string' ? body.password : ''
    if (!(await bcrypt.compare(password, user.password))) {
      throw new ApiError('INVALID_PARAMS', { field: 'password', reason: 'incorrect' })
    }
  }

  const affiliates = await prisma.affiliate.findMany({ where: { userId }, select: { id: true } })
  await prisma.$transaction([
    prisma.affiliateClick.deleteMany({ where: { affiliateId: { in: affiliates.map((a) => a.id) } } }),
    prisma.affiliate.deleteMany({ where: { userId } }),
    prisma.user.delete({ where: { id: userId } }),
  ])
  logAuthAction('ACCOUNT_DELETE', user.name, { userId, success: true })
  return NextResponse.json({ success: true })
})

import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { apiHandler, ApiError } from '@/lib/api-errors'
import { isErrorResponse, requireUserAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { AUTH_PASSWORD_RESET_LIMIT, checkRateLimit } from '@/lib/rate-limit'
import { sendPasswordChangedEmail } from '@/lib/email/notifications'
import { logAuthAction } from '@/lib/logging/semantic'

const MIN_PASSWORD_LENGTH = 6

/**
 * POST /api/user/change-password  { currentPassword, newPassword }
 * Google-only accounts have no password; they use "Forgot password" to create one by email.
 */
export const POST = apiHandler(async (request: NextRequest) => {
  const authResult = await requireUserAuth()
  if (isErrorResponse(authResult)) return authResult
  const userId = authResult.session.user.id

  const rate = await checkRateLimit('auth:change-password', userId, AUTH_PASSWORD_RESET_LIMIT)
  if (rate.limited) {
    return NextResponse.json(
      { success: false, message: 'Too many attempts. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } },
    )
  }

  const body = await request.json().catch(() => null) as { currentPassword?: unknown; newPassword?: unknown } | null
  const currentPassword = typeof body?.currentPassword === 'string' ? body.currentPassword : ''
  const newPassword = typeof body?.newPassword === 'string' ? body.newPassword : ''
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    throw new ApiError('INVALID_PARAMS', { field: 'newPassword', reason: 'tooShort', minLength: MIN_PASSWORD_LENGTH })
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, password: true } })
  if (!user) throw new ApiError('NOT_FOUND')
  if (!user.password) throw new ApiError('INVALID_PARAMS', { field: 'currentPassword', reason: 'noPassword' })
  if (!(await bcrypt.compare(currentPassword, user.password))) {
    logAuthAction('PASSWORD_CHANGE', user.name, { userId, error: 'Wrong current password' })
    throw new ApiError('INVALID_PARAMS', { field: 'currentPassword', reason: 'incorrect' })
  }

  await prisma.user.update({ where: { id: userId }, data: { password: await bcrypt.hash(newPassword, 12) } })
  logAuthAction('PASSWORD_CHANGE', user.name, { userId, success: true })
  await sendPasswordChangedEmail(userId)
  return NextResponse.json({ success: true })
})

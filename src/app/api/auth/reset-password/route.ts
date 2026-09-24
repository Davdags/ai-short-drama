import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { apiHandler, ApiError } from '@/lib/api-errors'
import { logAuthAction } from '@/lib/logging/semantic'
import { consumePasswordResetToken } from '@/lib/password-reset'
import { prisma } from '@/lib/prisma'
import { AUTH_PASSWORD_RESET_LIMIT, checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { sendPasswordChangedEmail } from '@/lib/email/notifications'

const MIN_PASSWORD_LENGTH = 6

export const POST = apiHandler(async (request: NextRequest) => {
  const rate = await checkRateLimit('auth:password-reset-submit', getClientIp(request), AUTH_PASSWORD_RESET_LIMIT)
  if (rate.limited) {
    return NextResponse.json(
      { success: false, message: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } },
    )
  }

  const body = await request.json().catch(() => null)
  const token = typeof body?.token === 'string' ? body.token.trim() : ''
  const password = typeof body?.password === 'string' ? body.password : ''

  if (!token) {
    throw new ApiError('INVALID_PARAMS', { field: 'token', reason: 'required' })
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new ApiError('INVALID_PARAMS', { field: 'password', reason: 'tooShort', minLength: MIN_PASSWORD_LENGTH })
  }

  const userId = await consumePasswordResetToken(token)
  if (!userId) {
    throw new ApiError('INVALID_PARAMS', { field: 'token', reason: 'invalidOrExpired' })
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { password: await bcrypt.hash(password, 12) },
    select: { id: true, name: true },
  })
  logAuthAction('PASSWORD_RESET', user.name, { userId: user.id, success: true })

  await sendPasswordChangedEmail(userId)
  return NextResponse.json({ success: true })
})

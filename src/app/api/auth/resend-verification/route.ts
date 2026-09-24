import { NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-errors'
import { isErrorResponse, requireUserAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { sendVerificationEmail } from '@/lib/email-verification'
import { AUTH_PASSWORD_RESET_LIMIT, checkRateLimit } from '@/lib/rate-limit'

/** POST /api/auth/resend-verification — sends a fresh verification email to the signed-in user. */
export const POST = apiHandler(async () => {
  const authResult = await requireUserAuth()
  if (isErrorResponse(authResult)) return authResult
  const userId = authResult.session.user.id

  const rate = await checkRateLimit('auth:resend-verification', userId, AUTH_PASSWORD_RESET_LIMIT)
  if (rate.limited) {
    return NextResponse.json(
      { success: false, message: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } },
    )
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, emailVerified: true } })
  if (!user?.email) return NextResponse.json({ success: false, reason: 'noEmail' }, { status: 400 })
  if (user.emailVerified) return NextResponse.json({ success: true, alreadyVerified: true })

  const sent = await sendVerificationEmail(user)
  return NextResponse.json({ success: true, sent })
})

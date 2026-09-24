import { NextRequest, NextResponse } from 'next/server'
import { apiHandler, ApiError } from '@/lib/api-errors'
import { findUserByEmail, isValidEmail, normalizeEmail } from '@/lib/auth-accounts'
import { isEmailConfigured, sendEmail } from '@/lib/email/send-email'
import { createScopedLogger } from '@/lib/logging/core'
import { logAuthAction } from '@/lib/logging/semantic'
import { issuePasswordResetToken, PASSWORD_RESET_TTL_MINUTES } from '@/lib/password-reset'
import { AUTH_PASSWORD_RESET_LIMIT, checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { BRAND_NAME } from '@/components/BrandWordmark'
import { renderEmail } from '@/lib/email/layout'

const logger = createScopedLogger({ module: 'auth.password-reset' })

function buildResetEmail(link: string) {
  const { html, text } = renderEmail({
    subject: `Reset your ${BRAND_NAME} password`,
    preheader: 'Use this link to choose a new password.',
    heading: 'Reset your password',
    paragraphs: [`We received a request to reset your ${BRAND_NAME} password.`],
    cta: { label: 'Reset password', url: link },
    note: `This link is valid for ${PASSWORD_RESET_TTL_MINUTES} minutes. If you didn't request it, you can ignore this email.`,
  })
  return { text, html }
}

export const POST = apiHandler(async (request: NextRequest) => {
  const rate = await checkRateLimit('auth:password-reset-request', getClientIp(request), AUTH_PASSWORD_RESET_LIMIT)
  if (rate.limited) {
    return NextResponse.json(
      { success: false, message: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } },
    )
  }

  const body = await request.json().catch(() => null)
  const email = typeof body?.email === 'string' ? normalizeEmail(body.email) : ''
  if (!isValidEmail(email)) {
    throw new ApiError('INVALID_PARAMS', { field: 'email', reason: 'invalid' })
  }

  const user = await findUserByEmail(email)
  if (user) {
    const token = await issuePasswordResetToken(user.id)
    const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const link = `${appUrl}/en/auth/reset-password?token=${token}`
    const sent = await sendEmail({ to: email, subject: `Reset your ${BRAND_NAME} password`, ...buildResetEmail(link) })
    // Local development without Resend: surface the link in the server log so the flow is testable.
    if (!sent && !isEmailConfigured() && process.env.NODE_ENV !== 'production') {
      logger.error({ message: 'email not configured: password reset link (development only)', details: { link } })
    }
    logAuthAction('PASSWORD_RESET_REQUEST', user.name, { userId: user.id, emailSent: sent })
  }

  // Same response whether or not the account exists, so the form can't be used to probe emails.
  return NextResponse.json({ success: true })
})

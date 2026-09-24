import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-errors'
import { getPublicBaseUrl } from '@/lib/env'
import { verifyEmailToken } from '@/lib/email-verification'
import { AUTH_PASSWORD_RESET_LIMIT, checkRateLimit, getClientIp } from '@/lib/rate-limit'

/**
 * GET /api/auth/verify-email?token=...  (public — opened from the verification email)
 * Verifies the email, grants the sign-up credits, then sends the user to their workspace.
 */
export const GET = apiHandler(async (request: NextRequest) => {
  // Public site address (the request origin can be the server's internal bind address).
  const target = new URL('/en/workspace', getPublicBaseUrl())
  const rate = await checkRateLimit('auth:verify-email', getClientIp(request), AUTH_PASSWORD_RESET_LIMIT)
  const token = request.nextUrl.searchParams.get('token') || ''
  const userId = !rate.limited && token ? await verifyEmailToken(token) : null
  target.searchParams.set('emailVerified', userId ? '1' : '0')
  return NextResponse.redirect(target)
})

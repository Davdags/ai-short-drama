import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-errors'
import { AFFILIATE_PROGRAM } from '@/lib/affiliate/program'
import { hashVisitor, recordAffiliateClick } from '@/lib/affiliate/service'
import { AFFILIATE_CLICK_LIMIT, checkRateLimit, getClientIp } from '@/lib/rate-limit'

/**
 * POST /api/affiliate/click  { code }
 * Public: called when a visitor lands with ?ref=code. Counts the click and remembers the
 * code in an httpOnly cookie so the sign-up can be attributed to the affiliate.
 */
export const POST = apiHandler(async (request: NextRequest) => {
  const ip = getClientIp(request)
  const rate = await checkRateLimit('affiliate:click', ip, AFFILIATE_CLICK_LIMIT)
  if (rate.limited) return NextResponse.json({ success: true, tracked: false })

  const body = await request.json().catch(() => null)
  const code = typeof body?.code === 'string' ? body.code.trim().toLowerCase() : ''
  const tracked = code ? await recordAffiliateClick(code, hashVisitor(ip, request.headers.get('user-agent') || '')) : false

  const response = NextResponse.json({ success: true, tracked })
  if (tracked) {
    response.cookies.set(AFFILIATE_PROGRAM.cookieName, code, {
      httpOnly: true,
      sameSite: 'lax',
      secure: request.nextUrl.protocol === 'https:',
      path: '/',
      maxAge: AFFILIATE_PROGRAM.cookieDays * 24 * 60 * 60,
    })
  }
  return response
})

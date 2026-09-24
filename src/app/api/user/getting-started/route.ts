import { NextResponse } from 'next/server'
import { requireUserAuth, isErrorResponse } from '@/lib/api-auth'
import { apiHandler } from '@/lib/api-errors'
import { getGettingStarted } from '@/lib/onboarding/getting-started'

/**
 * GET /api/user/getting-started
 * The new-account checklist, ticked from what the customer has actually done.
 */
export const GET = apiHandler(async () => {
  const authResult = await requireUserAuth()
  if (isErrorResponse(authResult)) return authResult
  return NextResponse.json({ success: true, ...(await getGettingStarted(authResult.session.user.id)) })
})

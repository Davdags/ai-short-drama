import { NextRequest, NextResponse } from 'next/server'
import { apiHandler, ApiError } from '@/lib/api-errors'
import { isErrorResponse, requireUserAuth } from '@/lib/api-auth'
import { AffiliateSettingsError, getAffiliateDashboard, updateAffiliateSettings } from '@/lib/affiliate/service'

/** GET /api/affiliate/me — the signed-in user's affiliate dashboard (created on first visit). */
export const GET = apiHandler(async () => {
  const authResult = await requireUserAuth()
  if (isErrorResponse(authResult)) return authResult
  const { user } = authResult.session

  const dashboard = await getAffiliateDashboard(user.id, user.name || 'creator')
  return NextResponse.json({ success: true, dashboard })
})

/** PUT /api/affiliate/me  { code? } | { payoutMethod, payoutDetails } */
export const PUT = apiHandler(async (request: NextRequest) => {
  const authResult = await requireUserAuth()
  if (isErrorResponse(authResult)) return authResult
  const { user } = authResult.session

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    throw new ApiError('INVALID_PARAMS', { field: 'body', reason: 'invalid' })
  }

  try {
    await updateAffiliateSettings(user.id, user.name || 'creator', body)
  } catch (error) {
    if (error instanceof AffiliateSettingsError) {
      throw new ApiError('INVALID_PARAMS', { field: error.field, reason: error.reason })
    }
    throw error
  }

  const dashboard = await getAffiliateDashboard(user.id, user.name || 'creator')
  return NextResponse.json({ success: true, dashboard })
})

import { NextRequest, NextResponse } from 'next/server'
import { apiHandler, ApiError } from '@/lib/api-errors'
import { isErrorResponse, requireUserAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

const FIELDS = ['emailGenerationUpdates', 'emailCreditAlerts'] as const
type Field = typeof FIELDS[number]

async function read(userId: string) {
  const prefs = await prisma.userPreference.findUnique({
    where: { userId },
    select: { emailGenerationUpdates: true, emailCreditAlerts: true },
  })
  return { emailGenerationUpdates: prefs?.emailGenerationUpdates ?? true, emailCreditAlerts: prefs?.emailCreditAlerts ?? true }
}

/** GET /api/user/email-preferences — which optional emails the user receives. */
export const GET = apiHandler(async () => {
  const authResult = await requireUserAuth()
  if (isErrorResponse(authResult)) return authResult
  return NextResponse.json({ success: true, preferences: await read(authResult.session.user.id) })
})

/** PUT /api/user/email-preferences  { emailGenerationUpdates?: boolean, emailCreditAlerts?: boolean } */
export const PUT = apiHandler(async (request: NextRequest) => {
  const authResult = await requireUserAuth()
  if (isErrorResponse(authResult)) return authResult
  const userId = authResult.session.user.id

  const body = await request.json().catch(() => null) as Record<string, unknown> | null
  const data: Partial<Record<Field, boolean>> = {}
  for (const field of FIELDS) {
    if (body?.[field] === undefined) continue
    if (typeof body[field] !== 'boolean') throw new ApiError('INVALID_PARAMS', { field, reason: 'invalid' })
    data[field] = body[field] as boolean
  }

  await prisma.userPreference.upsert({ where: { userId }, update: data, create: { userId, ...data } })
  return NextResponse.json({ success: true, preferences: await read(userId) })
})

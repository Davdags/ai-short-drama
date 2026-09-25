import { NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-errors'
import { isErrorResponse } from '@/lib/api-auth'
import { requireAdminAuth } from '@/lib/admin/access'
import { loadRevenueMetrics } from '@/lib/admin/revenue'

/** GET /api/admin/revenue — MRR, ARR, revenue, subscribers and costs for the owner dashboard (USD). */
export const GET = apiHandler(async () => {
  const auth = await requireAdminAuth()
  if (isErrorResponse(auth)) return auth

  return NextResponse.json({ success: true, ...(await loadRevenueMetrics()) })
})

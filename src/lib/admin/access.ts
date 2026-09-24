import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthSession, forbidden, unauthorized, type AuthSession } from '@/lib/api-auth'

/**
 * Owner/staff access. Admins are named in ADMIN_USERNAMES (comma-separated) — the same
 * setting that grants Studio-level speed limits. Never inferred from anything a user controls.
 */
export function adminUsernames(): Set<string> {
  return new Set((process.env.ADMIN_USERNAMES || '').split(',').map((name) => name.trim()).filter(Boolean))
}

export function isAdminUsername(name: string | null | undefined): boolean {
  return !!name && adminUsernames().has(name)
}

/** Session for an admin, or an error response. */
export async function requireAdminAuth(): Promise<{ session: AuthSession } | NextResponse> {
  const session = await getAuthSession()
  if (!session?.user?.id) return unauthorized()
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true } })
  if (!isAdminUsername(user?.name)) return forbidden()
  return { session }
}

/** Suspension lookup cached briefly so it doesn't add a query to every API call. */
const SUSPENSION_CACHE_MS = 30_000
const suspensionCache = new Map<string, { suspended: boolean; checkedAt: number }>()

export async function isUserSuspended(userId: string, now = Date.now()): Promise<boolean> {
  const cached = suspensionCache.get(userId)
  if (cached && now - cached.checkedAt < SUSPENSION_CACHE_MS) return cached.suspended
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { suspendedAt: true } }).catch(() => null)
  const suspended = Boolean(user?.suspendedAt)
  suspensionCache.set(userId, { suspended, checkedAt: now })
  return suspended
}

/** Called after an admin changes a user's status so the block applies immediately. */
export function clearSuspensionCache(userId?: string): void {
  if (userId) suspensionCache.delete(userId)
  else suspensionCache.clear()
}

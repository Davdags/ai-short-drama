import { prisma } from '@/lib/prisma'

export type PlanId = 'free' | 'starter' | 'pro' | 'studio'

/**
 * How many generations of each kind one user may run at the same time. Jobs beyond the
 * limit wait in the queue (shown as "Queued") without blocking other users.
 */
export const PLAN_PARALLEL_LIMITS: Record<PlanId, { image: number; video: number; merge: number }> = {
  free: { image: 2, video: 1, merge: 1 },
  starter: { image: 3, video: 2, merge: 1 },
  pro: { image: 6, video: 4, merge: 2 },
  studio: { image: 12, video: 8, merge: 2 },
}

/** Credits each plan receives per month (Free: one-time sign-up credits). */
export const PLAN_MONTHLY_CREDITS: Record<PlanId, number> = { free: 50, starter: 500, pro: 2_000, studio: 5_000 }

/** Usernames that always get Studio limits (the platform owner / staff), comma-separated. */
function adminUsernames(): Set<string> {
  return new Set((process.env.ADMIN_USERNAMES || '').split(',').map((name) => name.trim()).filter(Boolean))
}

const PAID_PLANS = new Set<PlanId>(['starter', 'pro', 'studio'])

/** The user's current plan: an active paid subscription, else Free. Staff always get Studio. */
export async function getUserPlanId(userId: string): Promise<PlanId> {
  const admins = adminUsernames()
  if (admins.size > 0) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } })
    if (user && admins.has(user.name)) return 'studio'
  }

  const subscription = await prisma.subscription.findFirst({
    where: { userId, status: 'active', currentPeriodEnd: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
    select: { planId: true },
  })
  // An unknown planId must not silently grant limits it should not.
  return subscription && PAID_PLANS.has(subscription.planId as PlanId) ? subscription.planId as PlanId : 'free'
}

export async function getUserParallelLimit(userId: string, scope: 'image' | 'video' | 'merge'): Promise<number> {
  return PLAN_PARALLEL_LIMITS[await getUserPlanId(userId)][scope]
}

import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/prisma', () => ({ prisma: {} }))

import {
  latestPerUser,
  monthlyValueUsd,
  revenueByMonth,
  subscriberMovement,
  sumPayments,
  summarizeSubscriptions,
  type PaymentRow,
  type SubscriptionRow,
} from '@/lib/admin/revenue'

const NOW = new Date('2026-09-25T12:00:00Z')
const daysAgo = (d: number) => new Date(NOW.getTime() - d * 24 * 60 * 60 * 1000)
const sub = (userId: string, planId: string, cycle: string, createdDaysAgo: number, endsInDays: number): SubscriptionRow => ({
  userId, planId, cycle, createdAt: daysAgo(createdDaysAgo), currentPeriodEnd: daysAgo(-endsInDays),
})
const pay = (userId: string, purpose: string, amountUsd: number, paidDaysAgo: number, provider = 'whop'): PaymentRow => ({
  userId, purpose, provider, amountUsd, paidAt: daysAgo(paidDaysAgo),
})

describe('admin revenue metrics', () => {
  it('values monthly plans at list price and spreads yearly plans over 12 months', () => {
    expect(monthlyValueUsd('starter', 'monthly')).toBe(19)
    expect(monthlyValueUsd('pro', 'yearly')).toBeCloseTo(490 / 12)
    expect(monthlyValueUsd('free', 'monthly')).toBe(0)
    expect(monthlyValueUsd('unknown', 'monthly')).toBe(0)
  })

  it('computes MRR, ARR, ARPU and the per-plan split', () => {
    const result = summarizeSubscriptions([sub('a', 'starter', 'monthly', 3, 27), sub('b', 'pro', 'monthly', 10, 20), sub('c', 'studio', 'yearly', 40, 325)])
    expect(result.mrr).toBe(150.5)
    expect(result.arr).toBe(1806)
    expect(result.subscribers).toBe(3)
    expect(result.monthly).toBe(2)
    expect(result.yearly).toBe(1)
    expect(result.arpu).toBe(50.17)
    expect(result.byPlan.studio).toEqual({ count: 1, mrr: 82.5 })
  })

  it('counts each user once, keeping the subscription that ends last', () => {
    const rows = latestPerUser([sub('a', 'starter', 'monthly', 40, -10), sub('a', 'pro', 'monthly', 10, 20)])
    expect(rows).toHaveLength(1)
    expect(rows[0].planId).toBe('pro')
  })

  it('sums revenue per window and splits plans from top-ups', () => {
    const payments = [pay('a', 'subscription', 19, 0.5), pay('b', 'credit_pack', 20, 3), pay('c', 'subscription', 49, 20), pay('d', 'subscription', 99, 60)]
    expect(sumPayments(payments, daysAgo(1))).toEqual({ total: 19, subscriptions: 19, topUps: 0, count: 1 })
    expect(sumPayments(payments, daysAgo(30))).toEqual({ total: 88, subscriptions: 68, topUps: 20, count: 3 })
    expect(sumPayments(payments).total).toBe(187)
  })

  it('buckets revenue by calendar month including empty months', () => {
    const months = revenueByMonth([pay('a', 'subscription', 19, 1), pay('b', 'subscription', 49, 40)], NOW, 3)
    expect(months).toEqual([
      { month: '2026-07', total: 0 },
      { month: '2026-08', total: 49 },
      { month: '2026-09', total: 19 },
    ])
  })

  it('treats renewals as retained, not churned or new', () => {
    const all = [
      sub('renewer', 'starter', 'monthly', 45, -15), sub('renewer', 'starter', 'monthly', 15, 15),
      sub('newbie', 'pro', 'monthly', 5, 25),
      sub('leaver', 'studio', 'monthly', 40, -10),
    ]
    const movement = subscriberMovement(all, new Set(['renewer', 'newbie']), daysAgo(30), NOW)
    expect(movement).toEqual({ newSubscribers: 1, newMrr: 49, churnedSubscribers: 1, churnedMrr: 99 })
  })
})

import { describe, expect, it } from 'vitest'
import {
  TOP_UP_CREDITS_PER_USD,
  TOP_UP_PRESETS_USD,
  parseTopUpAmount,
  topUpAmountMessage,
  topUpCredits,
} from '@/lib/billing/top-up'
import { PLAN_MONTHLY_CREDITS } from '@/lib/billing/plan-limits'
import { PLANS } from '@/app/[locale]/pricing/plans'

/** EvoLink charges $0.0147 per credit and one EvoLink credit is billed as 5 of ours. */
const EVOLINK_COST_PER_APP_CREDIT = 0.0147 / 5

describe('credit top-ups', () => {
  it('buys credits at each plan rate', () => {
    expect(topUpCredits('starter', 10)).toBe(250)
    expect(topUpCredits('pro', 20)).toBe(800)
    expect(topUpCredits('studio', 200)).toBe(10_000)
    expect(TOP_UP_PRESETS_USD).toEqual([10, 20, 50, 100, 200])
  })

  it('gives free users nothing — top-ups are for subscribers', () => {
    expect(topUpCredits('free', 50)).toBe(0)
    expect(topUpCredits(null, 50)).toBe(0)
  })

  it('never beats the plan itself, so upgrading stays the better deal', () => {
    for (const plan of PLANS.filter((entry) => entry.monthlyPrice > 0)) {
      const planRate = PLAN_MONTHLY_CREDITS[plan.id as keyof typeof PLAN_MONTHLY_CREDITS] / plan.monthlyPrice
      expect(TOP_UP_CREDITS_PER_USD[plan.id as keyof typeof TOP_UP_CREDITS_PER_USD]).toBeLessThanOrEqual(Math.ceil(planRate))
    }
  })

  it('keeps at least our 5x margin over EvoLink cost on every plan', () => {
    for (const rate of Object.values(TOP_UP_CREDITS_PER_USD)) {
      const pricePerCredit = 1 / rate
      expect(pricePerCredit / EVOLINK_COST_PER_APP_CREDIT).toBeGreaterThanOrEqual(5)
    }
  })

  it('accepts whole-dollar amounts from $10 to $1,000, including typed ones', () => {
    expect(parseTopUpAmount(10)).toEqual({ ok: true, usd: 10 })
    expect(parseTopUpAmount('25')).toEqual({ ok: true, usd: 25 })
    expect(parseTopUpAmount(' $40 ')).toEqual({ ok: true, usd: 40 })
    expect(parseTopUpAmount(9)).toEqual({ ok: false, reason: 'below_minimum' })
    expect(parseTopUpAmount(12.5)).toEqual({ ok: false, reason: 'not_whole_dollars' })
    expect(parseTopUpAmount(5000)).toEqual({ ok: false, reason: 'above_maximum' })
    expect(parseTopUpAmount('abc')).toEqual({ ok: false, reason: 'not_a_number' })
    expect(parseTopUpAmount(undefined)).toEqual({ ok: false, reason: 'not_a_number' })
  })

  it('explains a rejected amount in plain words', () => {
    expect(topUpAmountMessage('below_minimum')).toBe('The minimum top-up is $10.')
    expect(topUpAmountMessage('above_maximum')).toContain('$1,000')
  })
})

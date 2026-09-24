import type { PlanId } from './plan-limits'

/**
 * Credit top-ups: one-off purchases for paying subscribers, priced at the customer's own
 * plan rate. A top-up is never cheaper per credit than the next plan up, so upgrading stays
 * the better deal, and it never falls below our 5x margin on EvoLink cost (about $0.003 per
 * credit; Studio's 50 per $1 is $0.02).
 *
 * Credits land in the same balance as plan credits. Renewals only add to that balance and
 * an expired plan keeps it, so top-up credits never expire.
 */

/** Credits per US dollar, by plan. Matches each plan's own price per credit, rounded down. */
export const TOP_UP_CREDITS_PER_USD: Record<Exclude<PlanId, 'free'>, number> = {
  starter: 25,
  pro: 40,
  studio: 50,
}

/** Amounts offered as one-tap buttons, in USD. */
export const TOP_UP_PRESETS_USD = [10, 20, 50, 100, 200] as const

export const TOP_UP_MIN_USD = 10
/** Above this we would rather talk to the customer (and it caps the damage of a typo). */
export const TOP_UP_MAX_USD = 1000

export function isTopUpPlan(planId: string | null | undefined): planId is Exclude<PlanId, 'free'> {
  return planId === 'starter' || planId === 'pro' || planId === 'studio'
}

/** Credits a top-up of `usd` buys on `planId`; 0 when the plan cannot top up. */
export function topUpCredits(planId: string | null | undefined, usd: number): number {
  if (!isTopUpPlan(planId) || !Number.isFinite(usd) || usd <= 0) return 0
  return Math.floor(usd * TOP_UP_CREDITS_PER_USD[planId])
}

export type TopUpAmountError = 'not_a_number' | 'not_whole_dollars' | 'below_minimum' | 'above_maximum'

/**
 * Reads a top-up amount from a request or an input box. Whole dollars only, so local
 * prices round cleanly and the credits shown before paying are exactly what is granted.
 */
export function parseTopUpAmount(value: unknown): { ok: true; usd: number } | { ok: false; reason: TopUpAmountError } {
  const usd = typeof value === 'string' ? Number(value.trim().replace(/^\$/, '')) : value
  if (typeof usd !== 'number' || !Number.isFinite(usd)) return { ok: false, reason: 'not_a_number' }
  if (!Number.isInteger(usd)) return { ok: false, reason: 'not_whole_dollars' }
  if (usd < TOP_UP_MIN_USD) return { ok: false, reason: 'below_minimum' }
  if (usd > TOP_UP_MAX_USD) return { ok: false, reason: 'above_maximum' }
  return { ok: true, usd }
}

/** Short customer-facing message for a rejected amount. */
export function topUpAmountMessage(reason: TopUpAmountError): string {
  switch (reason) {
    case 'below_minimum': return `The minimum top-up is $${TOP_UP_MIN_USD}.`
    case 'above_maximum': return `The most you can top up at once is $${TOP_UP_MAX_USD.toLocaleString('en-US')}. For more, contact us.`
    case 'not_whole_dollars': return 'Please enter a whole dollar amount, like 25.'
    default: return 'Please enter an amount in dollars.'
  }
}

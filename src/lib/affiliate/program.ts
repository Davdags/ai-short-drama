/**
 * Affiliate program terms — shared by the affiliate dashboard and the commission logic,
 * so what affiliates are promised and what they are paid cannot drift apart.
 * Client-safe: no server imports.
 */
export interface AffiliateTier {
  name: 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond'
  /** Lifetime revenue (USD) from an affiliate's referred customers needed to reach this tier. */
  minRevenueUsd: number
  rate: number
}

/** Recurring commission that rises with the revenue an affiliate has brought in. */
export const AFFILIATE_TIERS: readonly AffiliateTier[] = [
  { name: 'Bronze', minRevenueUsd: 0, rate: 0.1 },
  { name: 'Silver', minRevenueUsd: 2_500, rate: 0.12 },
  { name: 'Gold', minRevenueUsd: 5_000, rate: 0.15 },
  { name: 'Platinum', minRevenueUsd: 25_000, rate: 0.2 },
  { name: 'Diamond', minRevenueUsd: 100_000, rate: 0.4 },
]

export const AFFILIATE_PROGRAM = {
  /** Commissions earned in a month are paid this many days after the month ends. */
  netDays: 60,
  /** Payouts are made monthly once an affiliate's payable balance reaches this. */
  minimumPayoutUsd: 50,
  /** How long a referral click is remembered before sign-up. */
  cookieName: 'na_ref',
  cookieDays: 30,
} as const

export function tierForRevenue(revenueUsd: number): AffiliateTier {
  let current = AFFILIATE_TIERS[0]
  for (const tier of AFFILIATE_TIERS) {
    if (revenueUsd >= tier.minRevenueUsd) current = tier
  }
  return current
}

export function nextTier(tier: AffiliateTier): AffiliateTier | null {
  const index = AFFILIATE_TIERS.findIndex((candidate) => candidate.name === tier.name)
  return AFFILIATE_TIERS[index + 1] ?? null
}

export function percent(rate: number): number {
  return Math.round(rate * 100)
}

/** Date a commission becomes payable: end of the month it was earned in, plus netDays. */
export function commissionAvailableAt(earnedAt: Date): Date {
  const monthEnd = new Date(Date.UTC(earnedAt.getUTCFullYear(), earnedAt.getUTCMonth() + 1, 1))
  return new Date(monthEnd.getTime() + AFFILIATE_PROGRAM.netDays * 24 * 60 * 60 * 1000)
}

const CODE_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])$/

/** Referral codes: 3–32 chars, lowercase letters, digits and inner hyphens. */
export function isValidReferralCode(code: string): boolean {
  return CODE_PATTERN.test(code) && !code.includes('--')
}

/** Default code in the style "david-b3d6da": username slug plus 6 chars of the user id. */
export function defaultReferralCode(username: string, userId: string): string {
  const slug = username.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 20) || 'creator'
  return `${slug}-${userId.replace(/-/g, '').slice(0, 6).toLowerCase()}`
}

export function referralLink(origin: string, code: string): string {
  return `${origin}/en?ref=${encodeURIComponent(code)}`
}

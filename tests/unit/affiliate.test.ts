import { beforeEach, describe, expect, it, vi } from 'vitest'

const prismaMock = vi.hoisted(() => ({
  affiliate: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  affiliateClick: { findFirst: vi.fn(), create: vi.fn() },
  affiliateReferral: { findUnique: vi.fn(), create: vi.fn() },
  affiliateCommission: { findUnique: vi.fn(), create: vi.fn(), aggregate: vi.fn(), updateMany: vi.fn() },
}))
vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))

import {
  commissionAvailableAt,
  defaultReferralCode,
  isValidReferralCode,
  nextTier,
  tierForRevenue,
} from '@/lib/affiliate/program'
import {
  attributeReferral,
  recordAffiliateClick,
  recordAffiliateCommission,
  voidAffiliateCommission,
} from '@/lib/affiliate/service'

describe('affiliate program terms', () => {
  it('picks the tier from lifetime referred revenue', () => {
    expect(tierForRevenue(0)).toMatchObject({ name: 'Bronze', rate: 0.1 })
    expect(tierForRevenue(2_499.99).name).toBe('Bronze')
    expect(tierForRevenue(2_500)).toMatchObject({ name: 'Silver', rate: 0.12 })
    expect(tierForRevenue(5_000).name).toBe('Gold')
    expect(tierForRevenue(25_000).name).toBe('Platinum')
    expect(tierForRevenue(250_000)).toMatchObject({ name: 'Diamond', rate: 0.4 })
    expect(nextTier(tierForRevenue(250_000))).toBeNull()
  })

  it('makes commissions payable 60 days after the month they were earned in ends', () => {
    expect(commissionAvailableAt(new Date('2026-09-22T10:00:00Z')).toISOString()).toBe('2026-11-30T00:00:00.000Z')
    expect(commissionAvailableAt(new Date('2026-12-31T23:00:00Z')).toISOString()).toBe('2027-03-02T00:00:00.000Z')
  })

  it('builds and validates referral codes', () => {
    expect(defaultReferralCode('David Dags', 'b3d6da12-0000-4000-8000-000000000000')).toBe('david-dags-b3d6da')
    expect(defaultReferralCode('😀', 'abcdef12-0000')).toBe('creator-abcdef')
    expect(isValidReferralCode('david-b3d6da')).toBe(true)
    expect(isValidReferralCode('ab')).toBe(false)
    expect(isValidReferralCode('-bad')).toBe(false)
    expect(isValidReferralCode('a--b')).toBe(false)
    expect(isValidReferralCode('UPPER')).toBe(false)
  })
})

describe('affiliate service', () => {
  beforeEach(() => vi.clearAllMocks())

  it('counts one click per visitor per day and ignores unknown codes', async () => {
    prismaMock.affiliate.findUnique.mockResolvedValueOnce(null)
    await expect(recordAffiliateClick('nobody-123', 'v1')).resolves.toBe(false)

    prismaMock.affiliate.findUnique.mockResolvedValue({ id: 'aff-1', userId: 'u-aff' })
    prismaMock.affiliateClick.findFirst.mockResolvedValueOnce(null)
    await expect(recordAffiliateClick('david-b3d6da', 'v1')).resolves.toBe(true)
    expect(prismaMock.affiliateClick.create).toHaveBeenCalledTimes(1)

    prismaMock.affiliateClick.findFirst.mockResolvedValueOnce({ id: 'click-1' })
    await recordAffiliateClick('david-b3d6da', 'v1')
    expect(prismaMock.affiliateClick.create).toHaveBeenCalledTimes(1)
  })

  it('never attributes self-referrals', async () => {
    prismaMock.affiliate.findUnique.mockResolvedValue({ id: 'aff-1', userId: 'u-1' })
    await expect(attributeReferral('u-1', 'david-b3d6da')).resolves.toBe(false)
    await expect(attributeReferral('u-2', 'david-b3d6da')).resolves.toBe(true)
    expect(prismaMock.affiliateReferral.create).toHaveBeenCalledWith({ data: { affiliateId: 'aff-1', referredUserId: 'u-2' } })
  })

  it('does not fail sign-up when attribution errors', async () => {
    prismaMock.affiliate.findUnique.mockRejectedValue(new Error('db down'))
    await expect(attributeReferral('u-2', 'david-b3d6da')).resolves.toBe(false)
  })

  it('pays the tier rate for the affiliate revenue before this payment', async () => {
    prismaMock.affiliateReferral.findUnique.mockResolvedValue({ affiliateId: 'aff-1', referredUserId: 'u-2' })
    prismaMock.affiliateCommission.findUnique.mockResolvedValue(null)
    prismaMock.affiliateCommission.aggregate.mockResolvedValue({ _sum: { paymentAmountUsd: 3_000 } })
    prismaMock.affiliateCommission.create.mockImplementation(async ({ data }) => data)

    const commission = await recordAffiliateCommission({ referredUserId: 'u-2', paymentRef: 'pay_1', amountUsd: 49, paidAt: new Date('2026-09-22T00:00:00Z') })
    expect(commission).toMatchObject({ tier: 'Silver', rate: 0.12, amountUsd: 5.88, paymentAmountUsd: 49 })
  })

  it('ignores customers who were not referred and repeated payments', async () => {
    prismaMock.affiliateReferral.findUnique.mockResolvedValueOnce(null)
    await expect(recordAffiliateCommission({ referredUserId: 'u-3', paymentRef: 'pay_2', amountUsd: 19 })).resolves.toBeNull()

    prismaMock.affiliateReferral.findUnique.mockResolvedValueOnce({ affiliateId: 'aff-1' })
    prismaMock.affiliateCommission.findUnique.mockResolvedValueOnce({ id: 'c-1', paymentRef: 'pay_1' })
    await expect(recordAffiliateCommission({ referredUserId: 'u-2', paymentRef: 'pay_1', amountUsd: 49 })).resolves.toMatchObject({ id: 'c-1' })
    expect(prismaMock.affiliateCommission.create).not.toHaveBeenCalled()
  })

  it('voids only unpaid commissions on refund', async () => {
    prismaMock.affiliateCommission.updateMany.mockResolvedValue({ count: 1 })
    await expect(voidAffiliateCommission('pay_1')).resolves.toBe(true)
    expect(prismaMock.affiliateCommission.updateMany).toHaveBeenCalledWith({ where: { paymentRef: 'pay_1', status: 'pending' }, data: { status: 'void' } })
  })
})

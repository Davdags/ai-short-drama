import { beforeEach, describe, expect, it, vi } from 'vitest'

const prismaMock = vi.hoisted(() => ({
  payment: { findUnique: vi.fn(), update: vi.fn(async () => ({})) },
  subscription: { updateMany: vi.fn(), create: vi.fn() },
  $transaction: vi.fn(),
}))
const ledgerMock = vi.hoisted(() => ({ addBalance: vi.fn(async () => true) }))
const emailMock = vi.hoisted(() => ({
  sendPaymentReceiptEmail: vi.fn(async () => undefined),
  sendTopUpReceiptEmail: vi.fn(async () => undefined),
}))

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))
vi.mock('@/lib/billing/ledger', () => ledgerMock)
vi.mock('@/lib/email/billing-emails', () => emailMock)
vi.mock('@/lib/affiliate/service', () => ({ recordAffiliateCommission: vi.fn(async () => undefined) }))
vi.mock('@/lib/providers/evolink/platform-defaults', () => ({ upgradeTrialDefaultsAfterPayment: vi.fn(async () => undefined) }))
vi.mock('@/lib/logging/core', () => ({
  createScopedLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}))

import { settlePayment } from '@/lib/payments/service'

/** A pending top-up: $20 on Pro, charged in naira at the flat ₦1,500 rate. */
const pendingTopUp = {
  id: 'pay-1',
  userId: 'user-1',
  providerRef: 'na_topup',
  purpose: 'credit_pack',
  planId: 'pro',
  cycle: null,
  amount: 30_000,
  currency: 'NGN',
  amountUsd: 20,
  status: 'pending',
}

describe('settling a credit top-up', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaMock.payment.findUnique.mockResolvedValue(pendingTopUp)
  })

  it('adds the credits for its price at the plan rate, without touching the subscription', async () => {
    const result = await settlePayment({
      providerRef: 'na_topup',
      provider: 'paystack',
      verified: { reference: 'na_topup', status: 'success', amount: 30_000, currency: 'NGN', paidAt: new Date('2026-09-25T10:00:00Z') },
    })

    expect(result).toEqual({ applied: true })
    expect(ledgerMock.addBalance).toHaveBeenCalledWith('user-1', 800, expect.objectContaining({ type: 'recharge', reason: 'credit top-up ($20)' }))
    expect(prismaMock.payment.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'success', creditsGranted: 800, amountUsd: 20 }),
    }))
    expect(prismaMock.subscription.create).not.toHaveBeenCalled()
    expect(emailMock.sendTopUpReceiptEmail).toHaveBeenCalledWith(expect.objectContaining({ credits: 800, amount: 30_000, currency: 'NGN' }))
    expect(emailMock.sendPaymentReceiptEmail).not.toHaveBeenCalled()
  })

  it('refuses an underpaid top-up instead of granting credits', async () => {
    const result = await settlePayment({
      providerRef: 'na_topup',
      provider: 'paystack',
      verified: { reference: 'na_topup', status: 'success', amount: 1_500, currency: 'NGN', paidAt: new Date() },
    })

    expect(result).toEqual({ applied: false, reason: 'amount_mismatch' })
    expect(ledgerMock.addBalance).not.toHaveBeenCalled()
    expect(prismaMock.payment.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'failed' }),
    }))
  })

  it('does not credit the same top-up twice', async () => {
    prismaMock.payment.findUnique.mockResolvedValue({ ...pendingTopUp, status: 'success' })
    const result = await settlePayment({
      providerRef: 'na_topup',
      provider: 'paystack',
      verified: { reference: 'na_topup', status: 'success', amount: 30_000, currency: 'NGN', paidAt: new Date() },
    })
    expect(result).toEqual({ applied: false, reason: 'already_settled' })
    expect(ledgerMock.addBalance).not.toHaveBeenCalled()
  })
})

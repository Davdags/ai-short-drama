import { beforeEach, describe, expect, it, vi } from 'vitest'

const ledgerMock = vi.hoisted(() => ({ addBalance: vi.fn() }))
vi.mock('@/lib/billing/ledger', () => ledgerMock)

import { SIGNUP_BONUS_CREDITS } from '@/lib/billing/credits-constants'
import { grantSignupBonus } from '@/lib/billing/signup-bonus'

describe('billing/signup-bonus', () => {
  beforeEach(() => vi.clearAllMocks())

  it('grants the 150-credit free trial with a per-user idempotency key', async () => {
    ledgerMock.addBalance.mockResolvedValue(true)
    await expect(grantSignupBonus('user-1')).resolves.toBe(true)
    expect(SIGNUP_BONUS_CREDITS).toBe(150)
    expect(ledgerMock.addBalance).toHaveBeenCalledWith('user-1', 150, {
      type: 'adjust',
      reason: 'signup bonus',
      idempotencyKey: 'signup-bonus:user-1',
    })
  })

  it('reports a failed grant without throwing', async () => {
    ledgerMock.addBalance.mockResolvedValue(false)
    await expect(grantSignupBonus('user-2')).resolves.toBe(false)
  })
})

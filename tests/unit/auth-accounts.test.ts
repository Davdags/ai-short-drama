import { beforeEach, describe, expect, it, vi } from 'vitest'

const prismaMock = vi.hoisted(() => ({
  user: { findFirst: vi.fn(), findUnique: vi.fn() },
  verificationToken: { findUnique: vi.fn(), deleteMany: vi.fn(), create: vi.fn() },
  $transaction: vi.fn(async (ops: unknown[]) => ops),
}))

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))

import { deriveUsernameBase, findUserByLogin, isValidEmail, normalizeEmail } from '@/lib/auth-accounts'
import { consumePasswordResetToken, hashResetToken } from '@/lib/password-reset'

describe('auth accounts', () => {
  beforeEach(() => vi.clearAllMocks())

  it('normalizes and validates emails', () => {
    expect(normalizeEmail('  David@Example.COM ')).toBe('david@example.com')
    expect(isValidEmail('david@example.com')).toBe(true)
    expect(isValidEmail('not-an-email')).toBe(false)
    expect(isValidEmail('a@b')).toBe(false)
  })

  it('derives a safe username base from names and emails', () => {
    expect(deriveUsernameBase('David.Dags+promo@gmail.com')).toBe('david_dags_promo')
    expect(deriveUsernameBase('Mr. Chen')).toBe('mr_chen')
    expect(deriveUsernameBase('😀')).toBe('creator')
    expect(deriveUsernameBase('x'.repeat(40))).toHaveLength(24)
  })

  it('looks users up by email when the identifier contains @, otherwise by username', async () => {
    await findUserByLogin('Someone@Example.com')
    expect(prismaMock.user.findFirst).toHaveBeenCalledWith({ where: { email: 'someone@example.com' } })

    await findUserByLogin('davdags')
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({ where: { name: 'davdags' } })
  })
})

describe('password reset tokens', () => {
  beforeEach(() => vi.clearAllMocks())

  it('stores only a SHA-256 hash of the token', () => {
    const hash = hashResetToken('raw-token')
    expect(hash).toMatch(/^[a-f0-9]{64}$/)
    expect(hash).not.toContain('raw-token')
    expect(hashResetToken('raw-token')).toBe(hash)
  })

  it('returns the user id for a valid token and consumes it', async () => {
    prismaMock.verificationToken.findUnique.mockResolvedValue({
      identifier: 'password-reset:user-1',
      expires: new Date(Date.now() + 60_000),
    })
    await expect(consumePasswordResetToken('raw')).resolves.toBe('user-1')
    expect(prismaMock.verificationToken.deleteMany).toHaveBeenCalledWith({ where: { identifier: 'password-reset:user-1' } })
  })

  it('rejects expired tokens but still consumes them', async () => {
    prismaMock.verificationToken.findUnique.mockResolvedValue({
      identifier: 'password-reset:user-1',
      expires: new Date(Date.now() - 1),
    })
    await expect(consumePasswordResetToken('raw')).resolves.toBeNull()
    expect(prismaMock.verificationToken.deleteMany).toHaveBeenCalled()
  })

  it('ignores verification tokens that are not password resets', async () => {
    prismaMock.verificationToken.findUnique.mockResolvedValue({
      identifier: 'email-verify:user-1',
      expires: new Date(Date.now() + 60_000),
    })
    await expect(consumePasswordResetToken('raw')).resolves.toBeNull()
    expect(prismaMock.verificationToken.deleteMany).not.toHaveBeenCalled()
  })
})

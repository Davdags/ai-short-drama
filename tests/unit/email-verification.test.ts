import { beforeEach, describe, expect, it, vi } from 'vitest'

const prismaMock = vi.hoisted(() => ({
  verificationToken: { findUnique: vi.fn(), deleteMany: vi.fn(), create: vi.fn() },
  user: { updateMany: vi.fn() },
  $transaction: vi.fn(async (ops: unknown[]) => ops),
}))
const bonusMock = vi.hoisted(() => ({ grantSignupBonus: vi.fn(async () => true) }))
const emailMock = vi.hoisted(() => ({ sendEmail: vi.fn(async (_message: { text: string }) => true), isEmailConfigured: vi.fn(() => true) }))

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))
vi.mock('@/lib/billing/signup-bonus', () => bonusMock)
vi.mock('@/lib/email/send-email', () => emailMock)

import { hashResetToken } from '@/lib/password-reset'
import { sendVerificationEmail, verifyEmailToken } from '@/lib/email-verification'

describe('email verification', () => {
  beforeEach(() => vi.clearAllMocks())

  it('verifies the email and grants the sign-up credits for a valid token', async () => {
    prismaMock.verificationToken.findUnique.mockResolvedValue({ identifier: 'email-verify:user-1', expires: new Date(Date.now() + 60_000) })
    await expect(verifyEmailToken('raw')).resolves.toBe('user-1')
    expect(prismaMock.verificationToken.findUnique).toHaveBeenCalledWith({ where: { token: hashResetToken('raw') } })
    expect(prismaMock.user.updateMany).toHaveBeenCalledWith({ where: { id: 'user-1', emailVerified: null }, data: { emailVerified: expect.any(Date) } })
    expect(bonusMock.grantSignupBonus).toHaveBeenCalledWith('user-1')
  })

  it('rejects expired tokens and tokens of another kind without granting credits', async () => {
    prismaMock.verificationToken.findUnique.mockResolvedValueOnce({ identifier: 'email-verify:user-1', expires: new Date(Date.now() - 1) })
    await expect(verifyEmailToken('raw')).resolves.toBeNull()
    prismaMock.verificationToken.findUnique.mockResolvedValueOnce({ identifier: 'password-reset:user-1', expires: new Date(Date.now() + 60_000) })
    await expect(verifyEmailToken('raw')).resolves.toBeNull()
    expect(bonusMock.grantSignupBonus).not.toHaveBeenCalled()
  })

  it('emails a link carrying the raw token while storing only its hash', async () => {
    await sendVerificationEmail({ id: 'user-1', email: 'a@example.com' })
    const stored = prismaMock.verificationToken.create.mock.calls[0][0].data
    const sentText = (emailMock.sendEmail.mock.calls as unknown as Array<[{ text: string }]>)[0][0].text
    const raw = sentText.match(/token=([a-f0-9]+)/)![1]
    expect(stored.identifier).toBe('email-verify:user-1')
    expect(stored.token).toBe(hashResetToken(raw))
    expect(stored.token).not.toBe(raw)
  })

  it('does nothing for accounts without an email', async () => {
    await expect(sendVerificationEmail({ id: 'user-1', email: null })).resolves.toBe(false)
    expect(emailMock.sendEmail).not.toHaveBeenCalled()
  })
})

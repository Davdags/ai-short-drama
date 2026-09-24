import { Prisma } from '@prisma/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const prismaMock = vi.hoisted(() => ({
  emailEvent: { create: vi.fn(), update: vi.fn(async () => ({})), delete: vi.fn(async () => ({})) },
  user: { findUnique: vi.fn() },
  userPreference: { findUnique: vi.fn() },
  userBalance: { findUnique: vi.fn() },
}))
const emailMock = vi.hoisted(() => ({ sendEmail: vi.fn(async (_message: { subject: string; html: string; text: string }) => true) }))
const planMock = vi.hoisted(() => ({
  getUserPlanId: vi.fn(async () => 'free'),
  PLAN_MONTHLY_CREDITS: { free: 50, starter: 500, pro: 2000, studio: 5000 },
}))

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))
vi.mock('@/lib/email/send-email', () => emailMock)
vi.mock('@/lib/billing/plan-limits', () => planMock)

import { notifyCreditsIfLow, notifyGenerationFailed, sendOnce, sendWelcomeEmail } from '@/lib/email/notifications'
import { renderEmail } from '@/lib/email/layout'

const sentSubjects = () => (emailMock.sendEmail.mock.calls as unknown as Array<[{ subject: string }]>).map(([message]) => message.subject)

describe('transactional emails', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaMock.user.findUnique.mockResolvedValue({ name: 'davdags', email: 'd@example.com' })
    prismaMock.userPreference.findUnique.mockResolvedValue(null)
    prismaMock.emailEvent.create.mockResolvedValue({})
  })

  it('sends an event only once (dedupe key already logged → no email)', async () => {
    const content = { subject: 'Hi', preheader: 'p', heading: 'h', paragraphs: ['x'] }
    await expect(sendOnce({ userId: 'u1', kind: 'k', dedupeKey: 'k:1', to: 'a@b.c', content })).resolves.toBe(true)
    prismaMock.emailEvent.create.mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'x' }))
    await expect(sendOnce({ userId: 'u1', kind: 'k', dedupeKey: 'k:1', to: 'a@b.c', content })).resolves.toBe(false)
    expect(emailMock.sendEmail).toHaveBeenCalledTimes(1)
  })

  it('frees the log entry when sending fails, so it can be retried later', async () => {
    emailMock.sendEmail.mockResolvedValueOnce(false)
    await sendOnce({ userId: 'u1', kind: 'k', dedupeKey: 'k:2', to: 'a@b.c', content: { subject: 's', preheader: 'p', heading: 'h', paragraphs: [] } })
    expect(prismaMock.emailEvent.delete).toHaveBeenCalledWith({ where: { dedupeKey: 'k:2' } })
  })

  it('sends the welcome email once per user', async () => {
    await sendWelcomeEmail('u1')
    expect(prismaMock.emailEvent.create).toHaveBeenCalledWith({ data: { userId: 'u1', kind: 'welcome', dedupeKey: 'welcome:u1' } })
    expect(sentSubjects()[0]).toContain('Welcome to NucleusArt')
  })

  it('warns about low credits under 20% of the plan and says empty at zero', async () => {
    prismaMock.userBalance.findUnique.mockResolvedValueOnce({ balance: 25 })
    await notifyCreditsIfLow('u1')
    expect(emailMock.sendEmail).not.toHaveBeenCalled()

    prismaMock.userBalance.findUnique.mockResolvedValueOnce({ balance: 8 })
    await notifyCreditsIfLow('u1')
    prismaMock.userBalance.findUnique.mockResolvedValueOnce({ balance: 0 })
    await notifyCreditsIfLow('u1')
    expect(sentSubjects()).toEqual(['Your NucleusArt credits are running low', "You're out of NucleusArt credits"])
  })

  it('respects the user switching an email type off', async () => {
    prismaMock.userBalance.findUnique.mockResolvedValue({ balance: 0 })
    prismaMock.userPreference.findUnique.mockResolvedValue({ emailCreditAlerts: false })
    await notifyCreditsIfLow('u1')
    prismaMock.userPreference.findUnique.mockResolvedValue({ emailGenerationUpdates: false })
    await notifyGenerationFailed({ userId: 'u1', creditsRefunded: true })
    expect(emailMock.sendEmail).not.toHaveBeenCalled()
  })

  it('never throws when something goes wrong', async () => {
    prismaMock.user.findUnique.mockRejectedValueOnce(new Error('db down'))
    await expect(sendWelcomeEmail('u1')).resolves.toBeUndefined()
  })
})

describe('email layout', () => {
  it('escapes user text and makes links absolute', () => {
    const email = renderEmail({ subject: 'S', preheader: 'P', heading: 'Hi <b>x</b>', paragraphs: ['a & b'], cta: { label: 'Go', url: '/en/pricing' } })
    expect(email.html).toContain('Hi &lt;b&gt;x&lt;/b&gt;')
    expect(email.html).toContain('a &amp; b')
    expect(email.html).toMatch(/href="https?:\/\/[^"]+\/en\/pricing"/)
    expect(email.text).toContain('Go: ')
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { estimateScriptWritingCredits, estimateStoryboardWritingCredits } from '@/lib/studio/writing-cost'

/**
 * Free trial: 150 credits must cover Gemini Flash writing (~47) and leave ~100 for pictures,
 * and a writing job the balance cannot cover must be refused up front (upgrade prompt)
 * instead of running past zero — text only holds ~12 credits before it runs.
 */
const db = vi.hoisted(() => ({
  studioProject: { findUnique: vi.fn() },
  userPreference: { findUnique: vi.fn() },
}))
const balance = vi.hoisted(() => ({ getBalance: vi.fn() }))
const mode = vi.hoisted(() => ({ getBillingMode: vi.fn(async () => 'ENFORCE') }))
vi.mock('@/lib/prisma', () => ({ prisma: db }))
vi.mock('@/lib/billing/ledger', () => balance)
vi.mock('@/lib/billing/mode', () => mode)

const STORY_CHARS = 1150

describe('writing cost estimates', () => {
  it('keeps Gemini Flash writing for a typical first story under 50 credits', () => {
    const total = estimateScriptWritingCredits('evolink::gemini-3-flash-preview', STORY_CHARS)
      + estimateStoryboardWritingCredits('evolink::gemini-3-flash-preview', 4)
    expect(total).toBeLessThanOrEqual(50)
  })

  it('prices Opus 5.5 at what it was measured to cost (~178 for 4 shots)', () => {
    const total = estimateScriptWritingCredits('evolink::claude-opus-5-5', STORY_CHARS)
      + estimateStoryboardWritingCredits('evolink::claude-opus-5-5', 4)
    expect(total).toBe(62 + 116)
  })

  it('prices an unmeasured model like the most expensive one, never lower', () => {
    expect(estimateScriptWritingCredits('evolink::some-new-model', STORY_CHARS))
      .toBe(estimateScriptWritingCredits('evolink::claude-opus-5-5', STORY_CHARS))
  })

  it('charges more for a longer story', () => {
    expect(estimateScriptWritingCredits('evolink::claude-sonnet-5', 5000))
      .toBeGreaterThan(estimateScriptWritingCredits('evolink::claude-sonnet-5', 500))
  })
})

describe('assertCanAffordWriting', () => {
  beforeEach(() => {
    db.studioProject.findUnique.mockResolvedValue({ analysisModel: 'evolink::claude-opus-5-5', targetDurationSec: 30, shotLengthSec: 8 })
    db.userPreference.findUnique.mockResolvedValue(null)
  })

  it('refuses up front with the out-of-credits error when the balance is short', async () => {
    balance.getBalance.mockResolvedValue({ balance: 40 })
    const { assertCanAffordWriting } = await import('@/lib/billing/writing-precheck')
    await expect(assertCanAffordWriting({ userId: 'u', projectId: 'p', stage: 'script', storyChars: STORY_CHARS }))
      .rejects.toMatchObject({ name: 'InsufficientBalanceError', required: 62, available: 40 })
  })

  it('lets the job run when the balance covers it', async () => {
    balance.getBalance.mockResolvedValue({ balance: 150 })
    db.studioProject.findUnique.mockResolvedValue({ analysisModel: 'evolink::gemini-3-flash-preview', targetDurationSec: 30, shotLengthSec: 8 })
    const { assertCanAffordWriting } = await import('@/lib/billing/writing-precheck')
    await expect(assertCanAffordWriting({ userId: 'u', projectId: 'p', stage: 'storyboard' })).resolves.toBeUndefined()
  })

  it('uses the storyboard size from the length plan', async () => {
    balance.getBalance.mockResolvedValue({ balance: 100 })
    const { assertCanAffordWriting } = await import('@/lib/billing/writing-precheck')
    // Opus 5.5, 30s of 8s shots = 4 shots × 29 = 116 > 100
    await expect(assertCanAffordWriting({ userId: 'u', projectId: 'p', stage: 'storyboard' }))
      .rejects.toMatchObject({ required: 116 })
  })
})

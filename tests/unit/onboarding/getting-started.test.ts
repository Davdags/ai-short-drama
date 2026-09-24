import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * The getting-started checklist ticks itself from real data and links each step to the
 * customer's latest project, so nothing has to be ticked by hand.
 */
const db = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  studioEpisode: { findFirst: vi.fn() },
  studioClip: { findFirst: vi.fn() },
  characterAppearance: { findFirst: vi.fn() },
  studioPanel: { findFirst: vi.fn() },
  project: { findFirst: vi.fn() },
}))
vi.mock('@/lib/prisma', () => ({ prisma: db }))

import { getGettingStarted } from '@/lib/onboarding/getting-started'

describe('getGettingStarted', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    db.user.findUnique.mockResolvedValue({ emailVerified: new Date() })
    db.studioEpisode.findFirst.mockResolvedValue(null)
    db.studioClip.findFirst.mockResolvedValue(null)
    db.characterAppearance.findFirst.mockResolvedValue(null)
    db.studioPanel.findFirst.mockResolvedValue(null)
    db.project.findFirst.mockResolvedValue(null)
  })

  it('starts a verified new account at 1 of 6 and points the story step to the Prompt Library', async () => {
    const state = await getGettingStarted('u1')
    expect(state).toMatchObject({ completed: 1, total: 6 })
    expect(state.steps.find((step) => step.id === 'story')?.href).toBe('/prompts')
  })

  it('ticks steps from real progress and links to the latest project', async () => {
    db.project.findFirst.mockResolvedValue({ id: 'p1' })
    db.studioEpisode.findFirst.mockResolvedValue({ novelText: 'A story' })
    db.studioClip.findFirst.mockResolvedValue({ id: 'c1' })
    db.characterAppearance.findFirst.mockResolvedValue({ id: 'a1' })
    db.studioPanel.findFirst.mockResolvedValueOnce({ id: 'panel-image' }).mockResolvedValueOnce(null)

    const state = await getGettingStarted('u1')
    expect(state.completed).toBe(5)
    expect(state.steps.find((step) => step.id === 'cast')?.href).toBe('/workspace/p1?stage=script')
    expect(state.steps.find((step) => step.id === 'video')).toMatchObject({ done: false, href: '/workspace/p1?stage=videos' })
  })

  it('treats an empty story box as not started', async () => {
    db.studioEpisode.findFirst.mockResolvedValue({ novelText: '   ' })
    const state = await getGettingStarted('u1')
    expect(state.steps.find((step) => step.id === 'story')?.done).toBe(false)
  })
})

import { describe, expect, it } from 'vitest'
import { computeWorkspaceProgress, stageBlocker, type WorkspaceProgressInput } from '@/lib/studio/workspace-progress'

/**
 * The workspace step bar and next-step card come from this. A customer should always be
 * told the one thing to do next, and an empty stage should say why it is empty.
 */
const base: WorkspaceProgressInput = { storyText: '', clipCount: 0, characters: [], locations: [], panels: [] }
const withStory = { ...base, storyText: 'Amara had been the quiet assistant…' }
const withScript = {
  ...withStory,
  clipCount: 3,
  characters: [{ name: 'Amara', hasImage: true }, { name: 'Chidi', hasImage: false }],
  locations: [{ name: 'Office', hasImage: false }],
}
const castDone = {
  ...withScript,
  characters: withScript.characters.map((c) => ({ ...c, hasImage: true })),
  locations: withScript.locations.map((l) => ({ ...l, hasImage: true })),
}

describe('computeWorkspaceProgress', () => {
  it('starts by asking for a story', () => {
    const progress = computeWorkspaceProgress(base)
    expect(progress.next.kind).toBe('write-story')
    expect(progress.steps.map((s) => s.state)).toEqual(['current', 'todo', 'todo', 'todo'])
  })

  it('asks to turn the story into a script once there is text', () => {
    expect(computeWorkspaceProgress(withStory).next.kind).toBe('run-script')
  })

  it('asks for the missing cast pictures before the storyboard, counting them', () => {
    const progress = computeWorkspaceProgress(withScript)
    expect(progress.next).toMatchObject({ kind: 'create-cast', stage: 'script', remaining: 2 })
    expect(progress.steps[0].state).toBe('done')
    expect(progress.steps[1]).toMatchObject({ state: 'current', detail: '1 of 3 cast pictures' })
  })

  it('then builds the storyboard, then asks for scene pictures', () => {
    expect(computeWorkspaceProgress(castDone).next.kind).toBe('run-storyboard')
    const scenes = computeWorkspaceProgress({ ...castDone, panels: [{ hasImage: true, hasVideo: false }, { hasImage: false, hasVideo: false }] })
    expect(scenes.next).toMatchObject({ kind: 'create-scenes', stage: 'storyboard', remaining: 1 })
    expect(scenes.steps[1].state).toBe('done')
  })

  it('moves to video when every scene has a picture, and finishes with export', () => {
    const video = computeWorkspaceProgress({ ...castDone, panels: [{ hasImage: true, hasVideo: false }] })
    expect(video.next.kind).toBe('create-videos')
    const done = computeWorkspaceProgress({ ...castDone, panels: [{ hasImage: true, hasVideo: true }] })
    expect(done.next.kind).toBe('export')
    expect(done.steps.every((s) => s.state === 'done')).toBe(true)
  })
})

describe('stageBlocker', () => {
  it('explains an empty storyboard and an empty video stage', () => {
    const progress = computeWorkspaceProgress(withScript)
    expect(stageBlocker('storyboard', progress)?.goTo).toBe('script')
    expect(stageBlocker('videos', progress)?.message).toMatch(/scene picture/)
  })

  it('stays out of the way once a stage has work in it', () => {
    const progress = computeWorkspaceProgress({ ...castDone, panels: [{ hasImage: true, hasVideo: false }] })
    expect(stageBlocker('storyboard', progress)).toBeNull()
    expect(stageBlocker('videos', progress)).toBeNull()
  })
})

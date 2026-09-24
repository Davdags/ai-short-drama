import { describe, expect, it } from 'vitest'
import {
  buildStoryboardDirective,
  distributeShots,
  estimateStoryCredits,
  mergeAdjacentToLimit,
  mergePanelsToBudget,
  resolveStoryLengthPlan,
  snapToAllowedDuration,
  totalShots,
} from '@/lib/studio/story-length'
import { applyLengthPlanToClips, type StoryToScriptClipCandidate } from '@/lib/studio/story-to-script/orchestrator'

describe('story length plan', () => {
  it('is off for legacy projects and validates stored values', () => {
    expect(resolveStoryLengthPlan({})).toBeNull()
    expect(resolveStoryLengthPlan({ targetDurationSec: 45, shotLengthSec: 8 })).toBeNull()
    expect(resolveStoryLengthPlan({ targetDurationSec: 30, shotLengthSec: null })).toEqual({ targetSeconds: 30, shotSeconds: 8 })
    expect(resolveStoryLengthPlan({ targetDurationSec: 15, shotLengthSec: 99 })).toEqual({ targetSeconds: 15, shotSeconds: 8 })
  })

  it('plans shots as length divided by shot length', () => {
    expect(totalShots({ targetSeconds: 30, shotSeconds: 8 })).toBe(4)
    expect(totalShots({ targetSeconds: 15, shotSeconds: 5 })).toBe(3)
    expect(totalShots({ targetSeconds: 60, shotSeconds: 4 })).toBe(15)
    expect(totalShots({ targetSeconds: 15, shotSeconds: 15 })).toBe(1)
    expect(totalShots({ targetSeconds: 90, shotSeconds: 12 })).toBe(8)
  })

  it('shares shots between clips by length, at least one each, summing exactly', () => {
    expect(distributeShots([100, 100], 4)).toEqual([2, 2])
    expect(distributeShots([300, 100], 4)).toEqual([3, 1])
    expect(distributeShots([10, 10, 1000], 5)).toEqual([1, 1, 3])
    const shares = distributeShots([7, 13, 29, 51], 11)
    expect(shares.reduce((a, b) => a + b, 0)).toBe(11)
    expect(Math.min(...shares)).toBeGreaterThanOrEqual(1)
    expect(() => distributeShots([1, 1, 1], 2)).toThrow('STORY_LENGTH_TOO_MANY_CLIPS')
  })

  it('merges the smallest neighbours first until under the limit', () => {
    const merged = mergeAdjacentToLimit(['aaaa', 'b', 'c', 'dddd'], 3, (s) => s.length, (a, b) => a + b)
    expect(merged).toEqual(['aaaa', 'bc', 'dddd'])
  })

  it('snaps to durations a model supports', () => {
    expect(snapToAllowedDuration(8, [5, 10])).toBe(10)
    expect(snapToAllowedDuration(7, [5, 10])).toBe(5)
    expect(snapToAllowedDuration(8, [5])).toBe(5)
    expect(snapToAllowedDuration(8, [])).toBe(8)
  })

  it('merges storyboard panels down to the budget without losing text', () => {
    const panels = [1, 2, 3, 4, 5].map((n) => ({ panel_number: n, description: `beat ${n}`, source_text: `line ${n}`, video_prompt: `move ${n}` }))
    const merged = mergePanelsToBudget(panels, 3)
    expect(merged).toHaveLength(3)
    expect(merged.map((panel) => panel.panel_number)).toEqual([1, 2, 3])
    const allText = merged.map((panel) => `${panel.description} ${panel.source_text}`).join(' ')
    for (const n of [1, 2, 3, 4, 5]) expect(allText).toContain(`beat ${n}`)
  })

  it('writes the storyboard instruction in the project language', () => {
    expect(buildStoryboardDirective('en', { panelBudget: 3, shotSeconds: 8 })).toContain('exactly 3 panel')
    expect(buildStoryboardDirective('zh', { panelBudget: 3, shotSeconds: 8, overBy: 2 })).toContain('恰好规划 3 个分镜')
  })

  it('estimates credits from shots and the video model', () => {
    const estimate = estimateStoryCredits({ targetSeconds: 30, shotSeconds: 8 })!
    expect(estimate.shots).toBe(4)
    expect(estimate.low).toBeLessThan(estimate.high)
    expect(estimateStoryCredits({ targetSeconds: 30, shotSeconds: 8 }, 'kling-v3-image-to-video')).toBeNull()
  })
})

describe('applyLengthPlanToClips', () => {
  const clip = (index: number, content: string): StoryToScriptClipCandidate => ({
    id: `clip_${index}`, startText: content.slice(0, 5), endText: content.slice(-5), summary: `s${index}`,
    location: null, characters: [`C${index}`], props: [], content, matchLevel: 'L1', matchConfidence: 1,
  })

  it('caps clips at the shot count by merging neighbours and budgets each clip', () => {
    const clips = [clip(1, 'a'.repeat(100)), clip(2, 'b'.repeat(20)), clip(3, 'c'.repeat(20)), clip(4, 'd'.repeat(100))]
    const result = applyLengthPlanToClips(clips, { targetSeconds: 15, shotSeconds: 5 })
    expect(result).toHaveLength(3)
    expect(result.map((item) => item.id)).toEqual(['clip_1', 'clip_2', 'clip_3'])
    expect(result[1].content).toBe('b'.repeat(20) + 'c'.repeat(20))
    expect(result[1].characters).toEqual(['C2', 'C3'])
    expect(result.reduce((sum, item) => sum + (item.durationSeconds || 0), 0)).toBe(15)
  })

  it('keeps clips when they already fit', () => {
    const result = applyLengthPlanToClips([clip(1, 'x'.repeat(50)), clip(2, 'y'.repeat(150))], { targetSeconds: 30, shotSeconds: 8 })
    expect(result.map((item) => item.durationSeconds)).toEqual([8, 24])
  })
})

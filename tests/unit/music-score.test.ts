import { describe, expect, it } from 'vitest'
import { buildScorePlan, isScorableMood, MOOD_MUSIC_STYLES } from '@/lib/music/score-plan'
import { buildScoreMixArgs } from '@/lib/music/score-mix'

describe('background score plan', () => {
  it('changes music with the mood, joins same-mood shots and stops for silence', () => {
    const plan = buildScorePlan([
      { duration: 4, mood: 'villain', musicHit: false },
      { duration: 5, mood: 'villain', musicHit: false },
      { duration: 6, mood: 'triumph', musicHit: false },
      { duration: 3, mood: 'silence', musicHit: false },
      { duration: 5, mood: 'suspense', musicHit: true },
    ])
    expect(plan.segments).toEqual([
      { mood: 'villain', start: 0, duration: 9 },
      { mood: 'triumph', start: 9, duration: 6 },
      { mood: 'suspense', start: 18, duration: 5 },
    ])
    expect(plan.hits).toEqual([18])
    expect(plan.moods).toEqual(['villain', 'triumph', 'suspense'])
  })

  it('carries the previous mood over shots without one, starting with tension', () => {
    const plan = buildScorePlan([
      { duration: 4, mood: null, musicHit: false },
      { duration: 4, mood: 'sad', musicHit: false },
      { duration: 4, mood: null, musicHit: false },
    ])
    expect(plan.segments).toEqual([
      { mood: 'tension', start: 0, duration: 4 },
      { mood: 'sad', start: 4, duration: 8 },
    ])
  })

  it('has a music style for every mood except silence', () => {
    for (const mood of ['tension', 'villain', 'confident', 'anger', 'triumph', 'sad', 'romantic', 'suspense', 'comedy', 'calm']) {
      expect(isScorableMood(mood)).toBe(true)
      expect(MOOD_MUSIC_STYLES[mood]).toMatch(/instrumental/)
    }
    expect(isScorableMood('silence')).toBe(false)
  })
})

describe('background score mix', () => {
  const plan = buildScorePlan([
    { duration: 4, mood: 'villain', musicHit: true },
    { duration: 6, mood: 'triumph', musicHit: false },
  ])

  it('lays each cue at its shot, ducks it under the dialogue and keeps the picture as is', () => {
    const args = buildScoreMixArgs({ mergedFile: 'merged.mp4', cueFiles: { villain: 'v.mp3', triumph: 't.mp3' }, plan, outputFile: 'scored.mp4' })!
    const filter = args[args.indexOf('-filter_complex') + 1]
    expect(args.filter((arg) => arg === '-i')).toHaveLength(4) // merged + 2 cues + 1 hit
    expect(args).toContain('v.mp3')
    expect(filter).toContain('adelay=3900:all=1') // triumph starts at 4s, blending in 0.1s early
    expect(filter).toContain('sidechaincompress')
    expect(filter).toContain('loudnorm=I=-14')
    expect(args.slice(args.indexOf('-c:v'), args.indexOf('-c:v') + 2)).toEqual(['-c:v', 'copy'])
    expect(args.at(-1)).toBe('scored.mp4')
  })

  it('skips moods without a cue and returns null when nothing is left to play', () => {
    const quiet = buildScorePlan([{ duration: 4, mood: 'sad', musicHit: false }])
    expect(buildScoreMixArgs({ mergedFile: 'm.mp4', cueFiles: {}, plan: quiet, outputFile: 'o.mp4' })).toBeNull()
    const partial = buildScoreMixArgs({ mergedFile: 'm.mp4', cueFiles: { triumph: 't.mp3' }, plan, outputFile: 'o.mp4' })!
    expect(partial).not.toContain('v.mp3')
    expect(partial).toContain('t.mp3')
  })
})

import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/prisma', () => ({ prisma: {} }))

import {
  carryShotFields,
  countSpeakerTurns,
  limitMusicHits,
  dialogueSeconds,
  normalizeShotDialogue,
  normalizeShotFields,
  normalizeShotMood,
  resolveShotDuration,
} from '@/lib/studio/shot-dialogue'
import { buildVoiceLinesFromPanels, emotionStrengthFromDelivery } from '@/lib/workers/handlers/script-to-storyboard-helpers'
import { buildVideoAudioDirective } from '@/lib/video/dialogue-prompt'
import { withPanelDuration } from '@/lib/video/panel-duration'

const chidi = { speaker: 'Chidi', line: 'Three years you made my coffee. Now you want my company?', delivery: 'shouting, fast' }

describe('shot dialogue', () => {
  it('accepts the shapes the AI returns and drops empty lines', () => {
    expect(normalizeShotDialogue([
      { speaker: 'Amara', line: ' Read the nameplate. ', delivery: 'cool' },
      { character: 'Chidi', lines: 'Get out.', parenthetical: 'angry' },
      { speaker: 'Nobody', line: '   ' },
      'not a line',
    ])).toEqual([
      { speaker: 'Amara', line: 'Read the nameplate.', delivery: 'cool' },
      { speaker: 'Chidi', line: 'Get out.', delivery: 'angry' },
    ])
    expect(normalizeShotDialogue(null)).toEqual([])
  })

  it('only keeps known moods', () => {
    expect(normalizeShotMood(' Villain ')).toBe('villain')
    expect(normalizeShotMood('epic')).toBeNull()
  })

  it('gives each shot enough time for its lines, within 4–15 seconds', () => {
    expect(dialogueSeconds([])).toBe(0)
    // 11 words at 2.5 words/s + 1.2s of reaction
    expect(dialogueSeconds([chidi])).toBeCloseTo(5.6)
    expect(resolveShotDuration(4, [chidi])).toBe(6)
    expect(resolveShotDuration(8, [chidi])).toBe(8)
    expect(resolveShotDuration(undefined, [])).toBe(4)
    expect(resolveShotDuration(30, [])).toBe(15)
    const speech = { speaker: 'A', line: 'word '.repeat(60), delivery: '' }
    expect(resolveShotDuration(6, [speech])).toBe(15)
  })

  it('normalizes a planned panel and copies dropped fields back after the detail pass', () => {
    const plan = [normalizeShotFields({ panel_number: 1, dialogue: [chidi], mood: 'anger', music_hit: true, duration: 4 })]
    expect(plan[0]).toMatchObject({ duration: 6, mood: 'anger', music_hit: true })
    const [final] = carryShotFields<Record<string, unknown>>([{ panel_number: 1, description: 'Chidi slams the desk' }], plan)
    expect(final.dialogue).toEqual([chidi])
    expect(final).toMatchObject({ duration: 6, mood: 'anger', music_hit: true, description: 'Chidi slams the desk' })
  })
})

describe('speaker turns and music hits', () => {
  it('counts a new turn each time the speaker changes', () => {
    const screenplay = {
      scenes: [
        { content: [
          { type: 'action', text: 'Rain.' },
          { type: 'dialogue', character: 'Seo-yeon', lines: 'We are closed.' },
          { type: 'dialogue', character: 'Jun-ho', lines: 'Pretend I am your boyfriend.' },
        ] },
        { content: [
          { type: 'dialogue', character: 'Seo-yeon', lines: 'Reporters!' },
          { type: 'dialogue', character: 'Seo-yeon', lines: 'You are late again, honey!' },
          { type: 'dialogue', character: 'Jun-ho', lines: 'Sorry, darling.' },
        ] },
      ],
    }
    expect(countSpeakerTurns(screenplay)).toBe(4)
    expect(countSpeakerTurns(null)).toBe(0)
    expect(countSpeakerTurns({ scenes: 'bad' })).toBe(0)
  })

  it('keeps only the last music hit in a clip', () => {
    const panels = limitMusicHits([{ music_hit: true }, { music_hit: false }, { music_hit: true }])
    expect(panels.map((panel) => panel.music_hit)).toEqual([false, false, true])
  })
})

describe('voice lines from shot dialogue', () => {
  it('numbers lines across shots and links each to its panel', () => {
    const rows = buildVoiceLinesFromPanels(
      [
        { finalPanels: [{ dialogue: [chidi] }, { dialogue: [] }] },
        { finalPanels: [{ dialogue: [{ speaker: 'Mrs. Okafor', line: 'That will is fake.', delivery: 'soft whisper' }] }] },
      ],
      [
        { storyboardId: 'sb1', clipId: 'c1', panels: [{ id: 'p1', panelIndex: 0 }, { id: 'p2', panelIndex: 1 }] },
        { storyboardId: 'sb2', clipId: 'c2', panels: [{ id: 'p3', panelIndex: 0 }] },
      ] as never,
    )
    expect(rows).toEqual([
      { lineIndex: 1, speaker: 'Chidi', content: chidi.line, emotionPrompt: 'shouting, fast', emotionStrength: 0.9, matchedPanel: { storyboardId: 'sb1', panelIndex: 0 } },
      { lineIndex: 2, speaker: 'Mrs. Okafor', content: 'That will is fake.', emotionPrompt: 'soft whisper', emotionStrength: 0.4, matchedPanel: { storyboardId: 'sb2', panelIndex: 0 } },
    ])
  })

  it('reads how strongly a line is performed from its delivery', () => {
    expect(emotionStrengthFromDelivery('Screaming in rage')).toBe(0.9)
    expect(emotionStrengthFromDelivery('cold whisper')).toBe(0.4)
    expect(emotionStrengthFromDelivery('matter-of-fact')).toBe(0.6)
  })
})

describe('video prompt and length per shot', () => {
  it('tells the video model the delivery, silence after the lines and no music', () => {
    const directive = buildVideoAudioDirective({ lines: [{ speaker: 'Chidi', content: chidi.line, delivery: 'shouting, fast' }], episodeHasVoiceLines: true })
    expect(directive).toContain('Chidi (shouting, fast): "Three years you made my coffee. Now you want my company?"')
    expect(directive).toContain('after the last line the characters stay silent')
    expect(directive).toContain('No background music.')
    expect(buildVideoAudioDirective({ lines: [], episodeHasVoiceLines: true })).toContain('No background music.')
  })

  it('gives each shot in "Generate all" its own length, snapped to the model', () => {
    const body = { videoModel: 'evolink::seedance-2.0', generationOptions: { resolution: '480p', duration: 8 } }
    expect(withPanelDuration(body, 5.6)).toEqual({ ...body, generationOptions: { resolution: '480p', duration: 6 } })
    expect(withPanelDuration(body, null)).toBe(body)
    expect(withPanelDuration({ videoModel: 'unknown::model' }, 6)).toEqual({ videoModel: 'unknown::model' })
  })
})

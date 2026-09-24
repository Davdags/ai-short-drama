import { describe, expect, it } from 'vitest'
import { buildVideoAudioDirective, isSoundOn } from '@/lib/video/dialogue-prompt'
import { mergeCapabilitySelectionJson } from '@/lib/model-capabilities/merge-selections'

describe('video audio directive', () => {
  it('states the exact lines, speakers and order when the panel has dialogue', () => {
    const directive = buildVideoAudioDirective({
      lines: [
        { speaker: 'David', content: 'Evans, how far have you gone with sportybet.' },
        { speaker: 'Evans', content: '  David am still working on it bro calm down ' },
      ],
      episodeHasVoiceLines: true,
    })
    expect(directive).toContain('David: "Evans, how far have you gone with sportybet."')
    expect(directive).toContain('Evans: "David am still working on it bro calm down"')
    expect(directive.indexOf('David:')).toBeLessThan(directive.indexOf('Evans:'))
    expect(directive).toContain('No other speech')
  })

  it('makes a panel without lines silent once the voice step has run', () => {
    const directive = buildVideoAudioDirective({ lines: [], episodeHasVoiceLines: true, sourceText: 'He said "hi"' })
    expect(directive).toContain('No spoken dialogue')
  })

  it('falls back to quoted story text before the voice step has run', () => {
    expect(buildVideoAudioDirective({ lines: [], episodeHasVoiceLines: false, sourceText: 'She whispers: “Run.”' }))
      .toContain('She whispers: “Run.”')
    expect(buildVideoAudioDirective({ lines: [], episodeHasVoiceLines: false, sourceText: 'Rain falls on the city.' }))
      .toContain('No spoken dialogue')
  })

  it('treats unset sound as the model default', () => {
    expect(isSoundOn(false, [true, false])).toBe(false)
    expect(isSoundOn(true, [false, true])).toBe(true)
    expect(isSoundOn(undefined, [true, false])).toBe(true)
    expect(isSoundOn(undefined, [false, true])).toBe(false)
    expect(isSoundOn(undefined, undefined)).toBe(false)
  })
})

describe('capability settings merge', () => {
  it('puts account defaults under project choices, per model', () => {
    const merged = JSON.parse(mergeCapabilitySelectionJson(
      '{"evolink::seedance-2.0":{"generateAudio":false,"resolution":"480p"}}',
      { 'evolink::seedance-2.0': { resolution: '720p' }, 'evolink::kling-v3-image-to-video': { duration: 10 } },
    )!)
    expect(merged['evolink::seedance-2.0']).toEqual({ generateAudio: false, resolution: '720p' })
    expect(merged['evolink::kling-v3-image-to-video']).toEqual({ duration: 10 })
    expect(mergeCapabilitySelectionJson(null, 'not json')).toBeNull()
  })
})

import { describe, expect, it } from 'vitest'
import {
  USD_TO_CNY,
  calcImage,
  calcLipSync,
  calcText,
  calcVideo,
  calcVoice,
  calcVoiceDesign,
  CREDITS_PER_CNY,
} from '@/lib/billing/cost'

describe('billing/cost', () => {
  it('calculates text cost by known model price table', () => {
    const cost = calcText('anthropic/claude-sonnet-4', 1_000_000, 1_000_000)
    expect(cost).toBeCloseTo(((3 + 15) * USD_TO_CNY) * CREDITS_PER_CNY, 8)
  })

  it('throws when text model pricing is unknown', () => {
    expect(() => calcText('unknown-model', 500_000, 250_000)).toThrow('Unknown text model pricing')
  })

  it('throws when image model pricing is unknown', () => {
    expect(() => calcImage('missing-image-model', 3)).toThrow('Unknown image model pricing')
  })

  it('supports resolution-aware video pricing', () => {
    const cost720 = calcVideo('doubao-seedance-1-0-pro-fast-251015', '720p', 2)
    const cost1080 = calcVideo('doubao-seedance-1-0-pro-fast-251015', '1080p', 2)
    expect(cost720).toBeCloseTo(0.86 * CREDITS_PER_CNY, 8)
    expect(cost1080).toBeCloseTo(2.06 * CREDITS_PER_CNY, 8)
    expect(() => calcVideo('doubao-seedance-1-0-pro-fast-251015', '2k', 1)).toThrow('Unsupported video resolution pricing')
    expect(() => calcVideo('unknown-video-model', '720p', 1)).toThrow('Unknown video model pricing')
  })

  it('scales ark video pricing by selected duration when tiers omit duration', () => {
    const shortDuration = calcVideo('doubao-seedance-1-0-pro-250528', '480p', 1, {
      generationMode: 'normal',
      resolution: '480p',
      duration: 2,
    })
    const longDuration = calcVideo('doubao-seedance-1-0-pro-250528', '1080p', 1, {
      generationMode: 'normal',
      resolution: '1080p',
      duration: 12,
    })

    expect(shortDuration).toBeCloseTo(0.292 * CREDITS_PER_CNY, 8)
    expect(longDuration).toBeCloseTo(8.808 * CREDITS_PER_CNY, 8)
  })

  it('uses Ark 1.5 official default generateAudio=true when audio is omitted', () => {
    const defaultAudio = calcVideo('doubao-seedance-1-5-pro-251215', '720p', 1, {
      generationMode: 'normal',
      resolution: '720p',
    })
    const muteAudio = calcVideo('doubao-seedance-1-5-pro-251215', '720p', 1, {
      generationMode: 'normal',
      resolution: '720p',
      generateAudio: false,
    })

    expect(defaultAudio).toBeCloseTo(1.73 * CREDITS_PER_CNY, 8)
    expect(muteAudio).toBeCloseTo(0.86 * CREDITS_PER_CNY, 8)
  })

  it('supports Ark Seedance 1.0 Lite i2v pricing and duration scaling', () => {
    const shortDuration = calcVideo('doubao-seedance-1-0-lite-i2v-250428', '480p', 1, {
      generationMode: 'normal',
      resolution: '480p',
      duration: 2,
    })
    const longDuration = calcVideo('doubao-seedance-1-0-lite-i2v-250428', '1080p', 1, {
      generationMode: 'firstlastframe',
      resolution: '1080p',
      duration: 12,
    })

    expect(shortDuration).toBeCloseTo(0.196 * CREDITS_PER_CNY, 8)
    expect(longDuration).toBeCloseTo(5.88 * CREDITS_PER_CNY, 8)
  })

  it('rejects unsupported Ark capability values before pricing', () => {
    expect(() => calcVideo('doubao-seedance-1-0-lite-i2v-250428', '720p', 1, {
      generationMode: 'normal',
      resolution: '720p',
      duration: 1,
    })).toThrow('Unsupported video capability pricing')
  })

  it('supports minimax capability-aware video pricing', () => {
    const hailuoNormal = calcVideo('minimax-hailuo-2.3', '768p', 1, {
      generationMode: 'normal',
      resolution: '768p',
      duration: 6,
    })
    const hailuoFirstLast = calcVideo('minimax-hailuo-02', '768p', 1, {
      generationMode: 'firstlastframe',
      resolution: '768p',
      duration: 10,
    })
    const t2v = calcVideo('t2v-01', '720p', 1, {
      generationMode: 'normal',
      resolution: '720p',
      duration: 6,
    })

    expect(hailuoNormal).toBeCloseTo(2.0 * CREDITS_PER_CNY, 8)
    expect(hailuoFirstLast).toBeCloseTo(4.0 * CREDITS_PER_CNY, 8)
    expect(t2v).toBeCloseTo(3.0 * CREDITS_PER_CNY, 8)
    expect(() => calcVideo('minimax-hailuo-02', '512p', 1, {
      generationMode: 'firstlastframe',
      resolution: '512p',
      duration: 6,
    })).toThrow('Unsupported video capability pricing')
  })

  it('prefers builtin image pricing over custom pricing when builtin exists', () => {
    const builtin = calcImage('banana', 1)
    const withCustom = calcImage('banana', 1, undefined, {
      image: {
        basePrice: 99,
      },
    })
    expect(withCustom).toBeCloseTo(builtin, 8)
  })

  it('uses custom image option pricing for unknown models', () => {
    const cost = calcImage(
      'openai-compatible:oa-1::gpt-image-1',
      2,
      {
        resolution: '1024x1024',
        quality: 'high',
      },
      {
        image: {
          basePrice: 0.2,
          optionPrices: {
            resolution: {
              '1024x1024': 0.05,
            },
            quality: {
              high: 0.1,
            },
          },
        },
      },
    )
    expect(cost).toBeCloseTo(((0.2 + 0.05 + 0.1) * 2) * CREDITS_PER_CNY, 8)
  })

  it('uses custom video option pricing for unknown models', () => {
    const cost = calcVideo(
      'openai-compatible:oa-1::sora-2',
      '720p',
      1,
      {
        resolution: '720x1280',
        duration: 8,
      },
      {
        video: {
          basePrice: 0.8,
          optionPrices: {
            resolution: {
              '720x1280': 0.2,
            },
            duration: {
              '8': 0.4,
            },
          },
        },
      },
    )
    expect(cost).toBeCloseTo(1.4 * CREDITS_PER_CNY, 8)
  })

  it('fails explicitly when selected custom option price is missing', () => {
    expect(() => calcVideo(
      'openai-compatible:oa-1::sora-2',
      '720p',
      1,
      {
        resolution: '1792x1024',
      },
      {
        video: {
          optionPrices: {
            resolution: {
              '720x1280': 0.2,
            },
          },
        },
      },
    )).toThrow('No custom video price matched')
  })

  it('returns deterministic fixed costs for call-based APIs', () => {
    expect(calcVoiceDesign()).toBeGreaterThan(0)
    expect(calcLipSync()).toBeGreaterThan(0)
    expect(calcLipSync('vidu::vidu-lipsync')).toBeGreaterThan(0)
    expect(calcLipSync('bailian::videoretalk')).toBeGreaterThan(0)
  })

  it('calculates voice costs from quantities', () => {
    expect(calcVoice(30)).toBeGreaterThan(0)
  })
})

describe('billing/cost NucleusArt credits (EvoLink)', () => {
  // EvoLink bills 25.11 EvoLink credits for a 4s 480p Seedance 2.0 clip; NucleusArt charges 5x.
  const evolinkCredits = (credits: number) => credits * 5

  it('charges Seedance 2.0 per second by resolution', () => {
    const meta = (resolution: string, duration: number) => ({ resolution, duration, generationMode: 'normal', generateAudio: false })
    expect(calcVideo('evolink::seedance-2.0', '480p', 1, meta('480p', 4))).toBeCloseTo(evolinkCredits(25.11), 6)
    expect(calcVideo('evolink::seedance-2.0', '720p', 1, meta('720p', 5))).toBeCloseTo(evolinkCredits(67.5), 6)
    expect(calcVideo('evolink::seedance-2.0', '720p', 1, meta('720p', 15))).toBeCloseTo(evolinkCredits(202.5), 6)
  })

  it('covers the observed GPT Image 2 cost per image', () => {
    // Highest real charge seen was 4.5736 EvoLink credits per image.
    expect(calcImage('evolink::gpt-image-2', 1)).toBeCloseTo(evolinkCredits(5), 6)
    expect(calcImage('evolink::gpt-image-2', 3)).toBeCloseTo(evolinkCredits(15), 6)
  })

  it('prices the EvoLink lip-sync model', () => {
    expect(calcLipSync('evolink::videoretalk')).toBeCloseTo(evolinkCredits(60), 6)
  })
})

describe('billing/cost Seedance 2.5 (EvoLink)', () => {
  it('charges EvoLink per-second rates by resolution at 5 credits per EvoLink credit', () => {
    const meta = (resolution: string, duration: number) => ({ resolution, duration, generationMode: 'normal', generateAudio: false })
    // EvoLink: 480p 9.3419, 720p 20.09, 1080p 50.225 credits per second.
    expect(calcVideo('evolink::seedance-2.5', '480p', 1, meta('480p', 4))).toBeCloseTo(9.3419 * 4 * 5, 6)
    expect(calcVideo('evolink::seedance-2.5', '720p', 1, meta('720p', 5))).toBeCloseTo(20.09 * 5 * 5, 6)
    expect(calcVideo('evolink::seedance-2.5', '1080p', 1, meta('1080p', 30))).toBeCloseTo(50.225 * 30 * 5, 6)
  })
})

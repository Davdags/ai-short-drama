import { beforeEach, describe, expect, it, vi } from 'vitest'

const redisMock = vi.hoisted(() => ({ eval: vi.fn() }))
vi.mock('@/lib/redis', () => ({ queueRedis: redisMock }))

import {
  evolinkRateLimitModel,
  evolinkRequestsPerMinute,
  waitForEvolinkRequestSlot,
} from '@/lib/providers/evolink/rate-limiter'

describe('EvoLink per-model rate limiter', () => {
  beforeEach(() => vi.clearAllMocks())

  it('groups variants under their model', () => {
    expect(evolinkRateLimitModel('seedance-2.0-fast-image-to-video')).toBe('seedance-2.0')
    expect(evolinkRateLimitModel('seedance-2.5-reference-to-video')).toBe('seedance-2.5')
    expect(evolinkRateLimitModel('kling-v3-image-to-video')).toBe('kling-v3')
    expect(evolinkRateLimitModel('wan2.6-image-to-video-flash')).toBe('wan2.6')
    expect(evolinkRateLimitModel('gpt-image-2-beta')).toBe('gpt-image-2')
    expect(evolinkRateLimitModel('claude-opus-4-6')).toBe('claude-opus-4-6')
  })

  it('stays under EvoLink limits (50/min, Seedance 2.5 30/min)', () => {
    expect(evolinkRequestsPerMinute('gpt-image-2')).toBe(45)
    expect(evolinkRequestsPerMinute('seedance-2.5-image-to-video')).toBe(25)
  })

  it('waits when the model is at its limit, then proceeds', async () => {
    redisMock.eval.mockResolvedValueOnce(30).mockResolvedValueOnce(0)
    await waitForEvolinkRequestSlot('seedance-2.0-image-to-video')
    expect(redisMock.eval).toHaveBeenCalledTimes(2)
    expect(redisMock.eval.mock.calls[0]).toEqual(expect.arrayContaining(['nucleusart:evolink-rpm:seedance-2.0', '45']))
  })

  it('never blocks generation when Redis is unavailable', async () => {
    redisMock.eval.mockRejectedValueOnce(new Error('redis down'))
    await expect(waitForEvolinkRequestSlot('gpt-image-2')).resolves.toBeUndefined()
  })
})

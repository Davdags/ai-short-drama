import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  isCentralEvolinkEnabled,
  listCentralEvolinkKeys,
  markCentralEvolinkKeyRateLimited,
  pickCentralEvolinkKey,
  resetCentralEvolinkRotation,
} from '@/lib/providers/evolink/central'

const saved = { keys: process.env.EVOLINK_API_KEYS, key: process.env.EVOLINK_API_KEY }

describe('central EvoLink keys', () => {
  beforeEach(() => {
    delete process.env.EVOLINK_API_KEYS
    delete process.env.EVOLINK_API_KEY
    resetCentralEvolinkRotation()
  })
  afterEach(() => {
    process.env.EVOLINK_API_KEYS = saved.keys
    process.env.EVOLINK_API_KEY = saved.key
    if (saved.keys === undefined) delete process.env.EVOLINK_API_KEYS
    if (saved.key === undefined) delete process.env.EVOLINK_API_KEY
  })

  it('is off without keys and reads one or several keys', () => {
    expect(isCentralEvolinkEnabled()).toBe(false)
    expect(() => pickCentralEvolinkKey()).toThrow('EVOLINK_CENTRAL_KEY_MISSING')
    process.env.EVOLINK_API_KEY = 'sk-one'
    expect(listCentralEvolinkKeys()).toEqual(['sk-one'])
    process.env.EVOLINK_API_KEYS = ' sk-a , sk-b,,sk-a '
    expect(listCentralEvolinkKeys()).toEqual(['sk-a', 'sk-b'])
    expect(isCentralEvolinkEnabled()).toBe(true)
  })

  it('rotates keys and skips a key resting after a 429', () => {
    process.env.EVOLINK_API_KEYS = 'sk-a,sk-b,sk-c'
    expect([pickCentralEvolinkKey(0), pickCentralEvolinkKey(0), pickCentralEvolinkKey(0), pickCentralEvolinkKey(0)])
      .toEqual(['sk-a', 'sk-b', 'sk-c', 'sk-a'])
    markCentralEvolinkKeyRateLimited('sk-b', 0)
    expect([pickCentralEvolinkKey(1), pickCentralEvolinkKey(1), pickCentralEvolinkKey(1)]).toEqual(['sk-c', 'sk-a', 'sk-c'])
    // After the rest period the key is used again.
    expect([pickCentralEvolinkKey(60_000), pickCentralEvolinkKey(60_000)]).toContain('sk-b')
  })

  it('still returns a key when every key is resting', () => {
    process.env.EVOLINK_API_KEYS = 'sk-a,sk-b'
    markCentralEvolinkKeyRateLimited('sk-a', 0)
    markCentralEvolinkKeyRateLimited('sk-b', 10)
    expect(pickCentralEvolinkKey(20)).toBe('sk-a')
  })
})

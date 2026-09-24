import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Regression: in central-key mode the synthetic EvoLink provider had no base URL.
 * Image and video generators hardcode EvoLink's endpoints so they kept working, but the
 * LLM client needs the URL passed in, so every story -> script -> storyboard call failed
 * on production with PROVIDER_BASE_URL_MISSING.
 */
const prismaMock = vi.hoisted(() => ({
  userPreference: { findUnique: vi.fn(async () => ({ customModels: null, customProviders: null })) },
}))
vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))

import { getProviderConfig } from '@/lib/api-config'
import { resetCentralEvolinkRotation } from '@/lib/providers/evolink/central'

const saved = process.env.EVOLINK_API_KEYS

describe('central EvoLink provider config', () => {
  beforeEach(() => {
    process.env.EVOLINK_API_KEYS = 'central-test-key'
    resetCentralEvolinkRotation()
  })
  afterEach(() => {
    if (saved === undefined) delete process.env.EVOLINK_API_KEYS
    else process.env.EVOLINK_API_KEYS = saved
  })

  it('includes the EvoLink base URL so LLM calls can be routed', async () => {
    const config = await getProviderConfig('user-1', 'evolink')
    expect(config.baseUrl).toBe('https://api.evolink.ai/v1')
  })

  it('uses the platform key, never a user-supplied one', async () => {
    const config = await getProviderConfig('user-1', 'evolink')
    expect(config.apiKey).toBe('central-test-key')
    expect(config.id).toBe('evolink')
  })
})

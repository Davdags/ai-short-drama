import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Regression: Seedance's own voices are now the default sound (each shot says its exact lines
 * and is only as long as they need). Accounts still on the old "audio off" default are moved
 * over at sign-in; a setting the user changed themselves is kept.
 */

const prismaMock = vi.hoisted(() => ({
  userPreference: {
    findUnique: vi.fn(),
    create: vi.fn(async () => ({})),
    update: vi.fn(async () => ({})),
  },
}))

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))
vi.mock('@/lib/providers/evolink/central', () => ({ isCentralEvolinkEnabled: () => true }))

import { ensurePlatformDefaultModels, PLATFORM_DEFAULT_CAPABILITIES, PLATFORM_DEFAULT_MODELS } from '@/lib/providers/evolink/platform-defaults'

const OLD_DEFAULT = JSON.stringify({
  'evolink::seedance-2.0': { generateAudio: false },
  'evolink::seedance-2.5': { generateAudio: false },
})

describe('Seedance audio default', () => {
  beforeEach(() => vi.clearAllMocks())

  it('turns generated audio on for new accounts', async () => {
    prismaMock.userPreference.findUnique.mockResolvedValueOnce(null)
    await ensurePlatformDefaultModels('user-1')
    const data = (prismaMock.userPreference.create.mock.calls[0] as unknown as [{ data: { capabilityDefaults: string } }])[0].data
    expect(JSON.parse(data.capabilityDefaults)['evolink::seedance-2.0']).toEqual({ generateAudio: true })
  })

  it('moves accounts still on the old audio-off default to the new one', async () => {
    prismaMock.userPreference.findUnique.mockResolvedValueOnce({ ...PLATFORM_DEFAULT_MODELS, capabilityDefaults: OLD_DEFAULT })
    await ensurePlatformDefaultModels('user-1')
    expect(prismaMock.userPreference.update).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      data: { capabilityDefaults: JSON.stringify(PLATFORM_DEFAULT_CAPABILITIES) },
    })
  })

  it('keeps a sound setting the user chose themselves', async () => {
    const custom = JSON.stringify({ 'evolink::seedance-2.0': { generateAudio: false, resolution: '720p' } })
    prismaMock.userPreference.findUnique.mockResolvedValueOnce({ ...PLATFORM_DEFAULT_MODELS, capabilityDefaults: custom })
    await ensurePlatformDefaultModels('user-1')
    expect(prismaMock.userPreference.update).not.toHaveBeenCalled()
  })
})

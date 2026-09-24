import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Production storyboard pictures failed with "EvoLink: Timed out fetching your input media
 * URL": EvoLink could not download character/location references from our server. With an
 * EvoLink key, stored references are now copied to EvoLink's own file host first.
 */
const storage = vi.hoisted(() => ({
  getObjectBuffer: vi.fn(),
  getSignedObjectUrl: vi.fn(async (key: string) => `/api/files/${key}?sig=abc`),
  extractStorageKey: vi.fn((input: string) => {
    if (input.startsWith('https://nucleusart.studio/api/files/')) return input.split('/api/files/')[1].split('?')[0]
    if (input.startsWith('images/')) return input
    return null
  }),
  uploadObject: vi.fn(),
  generateUniqueKey: vi.fn(() => 'tmp/evolink/x.png'),
}))
const upload = vi.hoisted(() => vi.fn(async () => ({ fileUrl: 'https://files.evolink.ai/references/abc.png' })))

vi.mock('@/lib/storage', () => storage)
vi.mock('@/lib/env', () => ({ getPublicBaseUrl: () => 'https://nucleusart.studio' }))
vi.mock('@/lib/media/outbound-image', () => ({ normalizeToOriginalMediaUrl: vi.fn(async (u: string) => u) }))
vi.mock('@/lib/storage/utils', () => ({ toFetchableUrl: (u: string) => u }))
vi.mock('@/lib/providers/evolink/file-upload', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/providers/evolink/file-upload')>()),
  uploadBufferToEvolinkFiles: upload,
}))

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0, 1, 2, 3])

describe('resolveToExternalUrl with an EvoLink key', () => {
  beforeEach(() => {
    vi.resetModules()
    upload.mockClear()
    storage.getObjectBuffer.mockReset().mockResolvedValue(PNG)
  })

  it('uploads a stored reference picture to EvoLink and sends that URL', async () => {
    const { resolveToExternalUrl } = await import('@/lib/providers/evolink/url-resolver')
    const url = await resolveToExternalUrl('images/amara-1', { apiKey: 'k' })
    expect(url).toBe('https://files.evolink.ai/references/abc.png')
    expect(upload).toHaveBeenCalledWith(PNG, 'image/png', 'k', { uploadPath: 'references' })
  })

  it('also uploads our own public site URLs instead of passing them through', async () => {
    const { resolveToExternalUrl } = await import('@/lib/providers/evolink/url-resolver')
    const url = await resolveToExternalUrl('https://nucleusart.studio/api/files/images/amara-1?sig=1', { apiKey: 'k' })
    expect(url).toBe('https://files.evolink.ai/references/abc.png')
  })

  it('reuses one upload for the same picture across shots', async () => {
    const { resolveToExternalUrl } = await import('@/lib/providers/evolink/url-resolver')
    await resolveToExternalUrl('images/amara-1', { apiKey: 'k' })
    await resolveToExternalUrl('images/amara-1', { apiKey: 'k' })
    expect(upload).toHaveBeenCalledTimes(1)
  })

  it('falls back to our signed URL when the upload fails', async () => {
    upload.mockRejectedValueOnce(new Error('EVOLINK_FILES_UPLOAD_FAILED(500)'))
    const { resolveToExternalUrl } = await import('@/lib/providers/evolink/url-resolver')
    const url = await resolveToExternalUrl('images/amara-1', { apiKey: 'k' })
    expect(url).toBe('https://nucleusart.studio/api/files/images/amara-1?sig=abc')
  })

  it('leaves third-party URLs and key-less calls unchanged', async () => {
    const { resolveToExternalUrl } = await import('@/lib/providers/evolink/url-resolver')
    expect(await resolveToExternalUrl('https://cdn.example.com/a.png', { apiKey: 'k' })).toBe('https://cdn.example.com/a.png')
    expect(await resolveToExternalUrl('images/amara-1')).toBe('https://nucleusart.studio/api/files/images/amara-1?sig=abc')
    expect(upload).not.toHaveBeenCalled()
  })
})

import { extractStorageKey, getSignedObjectUrl, uploadObject, generateUniqueKey } from '@/lib/storage'
import { normalizeToOriginalMediaUrl } from '@/lib/media/outbound-image'
import { toFetchableUrl } from '@/lib/storage/utils'
import { getPublicBaseUrl } from '@/lib/env'
import { getObjectBuffer } from '@/lib/storage'
import { guessMimeTypeFromKey, isEvolinkUploadSupported, uploadBufferToEvolinkFiles } from './file-upload'
import { createScopedLogger } from '@/lib/logging/core'

const logger = createScopedLogger({ module: 'evolink.url-resolver' })

export interface ResolveExternalUrlOptions {
  /**
   * EvoLink key. When given, our own stored images are copied to EvoLink's file host and
   * that URL is sent instead. EvoLink could not fetch reference pictures from our server
   * reliably ("Timed out fetching your input media URL"), which failed every storyboard
   * picture that used a character or location reference.
   */
  apiKey?: string
}

/** EvoLink files expire after 72h; reuse an upload for a day. */
const EVOLINK_UPLOAD_TTL_MS = 24 * 60 * 60 * 1000
const evolinkUploadCache = new Map<string, { url: string; expiresAt: number }>()

/** Picture type from its first bytes, for stored media keys that carry no extension. */
export function sniffImageMimeType(buffer: Buffer): string | null {
  if (buffer.length < 12) return null
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return 'image/png'
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg'
  if (buffer.toString('ascii', 0, 4) === 'GIF8') return 'image/gif'
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'image/webp'
  return null
}

async function uploadStoredObjectToEvolink(key: string, apiKey: string): Promise<string | null> {
  const cached = evolinkUploadCache.get(key)
  if (cached && cached.expiresAt > Date.now()) return cached.url
  try {
    const buffer = await getObjectBuffer(key)
    const mimeType = guessMimeTypeFromKey(key) ?? sniffImageMimeType(buffer)
    if (!mimeType || !isEvolinkUploadSupported(mimeType)) return null
    const uploaded = await uploadBufferToEvolinkFiles(buffer, mimeType, apiKey, { uploadPath: 'references' })
    evolinkUploadCache.set(key, { url: uploaded.fileUrl, expiresAt: Date.now() + EVOLINK_UPLOAD_TTL_MS })
    return uploaded.fileUrl
  } catch (error) {
    // Fall back to our own signed URL rather than failing the generation outright.
    logger.warn({ message: 'EvoLink reference upload failed; using signed URL', details: { key, error: String(error) } })
    return null
  }
}

function isOwnSiteUrl(url: string): boolean {
  try {
    return new URL(url).host === new URL(getPublicBaseUrl()).host
  } catch {
    return false
  }
}

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'audio/wav': 'wav',
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'video/mp4': 'mp4',
}

/**
 * Detect private/internal network URLs that must not be forwarded to external APIs.
 * Covers: loopback, Docker Compose service hostnames, RFC-1918 ranges.
 */
function isPrivateUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.toLowerCase()
    // Loopback
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '0.0.0.0') return true
    // Docker Compose internal service names
    if (host === 'minio' || host === 'redis' || host === 'mysql' || host === 'app') return true
    // RFC-1918: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16
    const parts = host.split('.')
    if (parts[0] === '10') return true
    if (parts[0] === '172' && Number(parts[1]) >= 16 && Number(parts[1]) <= 31) return true
    if (parts[0] === '192' && parts[1] === '168') return true
    return false
  } catch {
    return false
  }
}

/**
 * Convert internal storage paths / data URLs to externally-accessible URLs
 * for EvoLink API consumption.
 *
 * - Images uploaded via EvoLink storage → public EvoLink Files URL
 * - Audio/video stored locally → absolute internal URL (requires INTERNAL_APP_URL reachable from EvoLink)
 * - Already public HTTPS → returned as-is
 *
 * Returns null if the input cannot be resolved.
 */
export async function resolveToExternalUrl(input: string, options: ResolveExternalUrlOptions = {}): Promise<string | null> {
  const toPublicUrl = (key: string) => toExternalUrl(key, options.apiKey)

  // Already a public URL — guard against forwarding internal/private network URLs to EvoLink.
  // Our own site's URLs still go through the upload below: EvoLink cannot fetch them reliably.
  if (input.startsWith('https://') && !isPrivateUrl(input)) {
    const ownKey = options.apiKey && isOwnSiteUrl(input) ? extractStorageKey(input) : null
    return ownKey ? toPublicUrl(ownKey) : input
  }

  // data URL → upload to storage → return URL
  if (input.startsWith('data:')) {
    try {
      const match = input.match(/^data:([^;]+);base64,(.+)$/)
      if (!match) return null
      const mimeType = match[1]
      const ext = MIME_TO_EXT[mimeType] || mimeType.split('/').pop() || 'bin'
      const buffer = Buffer.from(match[2], 'base64')
      const tmpKey = generateUniqueKey('tmp/evolink', ext)
      // TODO: These temp objects are never explicitly deleted.
      // - EvoLink storage: auto-expires in 72h (acceptable, Files API TTL).
      // - Local/MinIO fallback: accumulates indefinitely — add a periodic cleanup job
      //   (e.g., delete tmp/evolink/* older than 24h) if local fallback is in use.
      const storedKey = await uploadObject(buffer, tmpKey)
      return toPublicUrl(storedKey)
    } catch {
      return null
    }
  }

  // Try to extract storage key → resolve to URL
  const key = extractStorageKey(input)
  if (key) {
    return toPublicUrl(key)
  }

  // Try to normalize via media service
  try {
    const resolved = await normalizeToOriginalMediaUrl(input)
    if (resolved.startsWith('https://') || resolved.startsWith('http://')) {
      const resolvedKey = extractStorageKey(resolved)
      if (resolvedKey) return toPublicUrl(resolvedKey)
      return resolved
    }
  } catch { /* ignore */ }

  return null
}

/**
 * Convert a storage key to a publicly-accessible URL.
 * - EvoLink file URLs (https://files.evolink.ai/...) → return as-is
 * - Other HTTPS URLs → return as-is
 * - Local storage keys → generate signed URL, make absolute via toFetchableUrl
 */
async function toExternalUrl(key: string, apiKey?: string): Promise<string> {
  if (key.startsWith('https://')) return key
  if (apiKey) {
    const uploaded = await uploadStoredObjectToEvolink(key, apiKey)
    if (uploaded) return uploaded
  }
  const signedUrl = await getSignedObjectUrl(key, 3600)
  if (signedUrl.startsWith('https://') || signedUrl.startsWith('http://')) return signedUrl
  // Relative app URL (/api/files/...): EvoLink must fetch it from the public site address,
  // not the internal container address (which it cannot reach).
  if (signedUrl.startsWith('/')) return `${getPublicBaseUrl().replace(/\/+$/, '')}${signedUrl}`
  return toFetchableUrl(signedUrl)
}

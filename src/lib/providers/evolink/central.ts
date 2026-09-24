/**
 * Central EvoLink account (NucleusArt SaaS mode).
 *
 * When EVOLINK_API_KEYS (comma-separated) or EVOLINK_API_KEY is set on the server, every
 * user generates through these platform keys; keys stored in user settings are ignored.
 * With several keys, calls rotate between them and a key that answers 429 (rate limited)
 * is rested for a while so traffic moves to the others.
 */

export const CENTRAL_EVOLINK_PROVIDER_ID = 'evolink'

const RATE_LIMIT_REST_MS = 30_000

let cursor = 0
const restedUntil = new Map<string, number>()

export function listCentralEvolinkKeys(): string[] {
  const raw = process.env.EVOLINK_API_KEYS || process.env.EVOLINK_API_KEY || ''
  return [...new Set(raw.split(',').map((key) => key.trim()).filter(Boolean))]
}

export function isCentralEvolinkEnabled(): boolean {
  return listCentralEvolinkKeys().length > 0
}

/** Next key in rotation, skipping keys resting after a 429 (unless every key is resting). */
export function pickCentralEvolinkKey(now = Date.now()): string {
  const keys = listCentralEvolinkKeys()
  if (keys.length === 0) throw new Error('EVOLINK_CENTRAL_KEY_MISSING')
  for (let offset = 0; offset < keys.length; offset += 1) {
    const key = keys[(cursor + offset) % keys.length]
    if ((restedUntil.get(key) ?? 0) <= now) {
      cursor = (cursor + offset + 1) % keys.length
      return key
    }
  }
  // All keys are resting: use the one that recovers first.
  return keys.reduce((best, key) => ((restedUntil.get(key) ?? 0) < (restedUntil.get(best) ?? 0) ? key : best))
}

/** Call when EvoLink answers 429 for a key, so the rotation avoids it for a while. */
export function markCentralEvolinkKeyRateLimited(apiKey: string, now = Date.now()): void {
  if (listCentralEvolinkKeys().includes(apiKey)) restedUntil.set(apiKey, now + RATE_LIMIT_REST_MS)
}

/** Test helper. */
export function resetCentralEvolinkRotation(): void {
  cursor = 0
  restedUntil.clear()
}

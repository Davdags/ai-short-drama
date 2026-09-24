/**
 * Keeps internal diagnostics away from customers.
 *
 * Worker and provider errors are written for us — "PROVIDER_BASE_URL_MISSING: evolink (llm)",
 * "ECONNREFUSED 127.0.0.1:6379". Those reached customers verbatim in alert boxes. Messages
 * already written for people ("Needs 50 credits, you have 25.") pass through unchanged.
 */

const FRIENDLY_FALLBACK = 'Something went wrong on our side. Please try again in a moment — you haven’t been charged for this.'

/** A leading machine code such as PROVIDER_BASE_URL_MISSING or EVOLINK_IMAGE_SUBMIT_FAILED(500). */
const LEADING_CODE = /^([A-Z][A-Z0-9_]{3,})(\(\d+\))?\s*:?\s*/

const LOW_LEVEL = /\b(ECONNREFUSED|ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|socket hang up|Unexpected token|is not a function|Cannot read propert|undefined is not|Prisma|P\d{4}\b)/i

/** Reads like a sentence meant for a person, rather than an identifier or a fragment. */
function looksHumanReadable(text: string): boolean {
  const words = text.trim().split(/\s+/)
  if (words.length < 3) return false
  if (!/^[A-Z]/.test(text.trim())) return false
  return !LOW_LEVEL.test(text)
}

export function humanizeErrorMessage(message: string | null | undefined, fallback = FRIENDLY_FALLBACK): string {
  const text = (message || '').trim()
  if (!text) return fallback
  if (LOW_LEVEL.test(text)) return fallback

  const code = text.match(LEADING_CODE)
  if (!code) return text

  // "ANALYSIS_MODEL_NOT_CONFIGURED: Choose a story model in Settings first." keeps its sentence.
  const remainder = text.slice(code[0].length).trim()
  return looksHumanReadable(remainder) ? remainder : fallback
}

export const FRIENDLY_ERROR_FALLBACK = FRIENDLY_FALLBACK

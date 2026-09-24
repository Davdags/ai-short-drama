/**
 * What the writing steps cost, per writing model, in NucleusArt credits. Shown on the buttons
 * before the customer clicks, and checked on the server so a job the balance cannot cover is
 * refused up front (the upgrade prompt opens) instead of running past zero.
 *
 * Text is billed on tokens actually used, which is only known afterwards, so these are
 * estimates measured on production with the same 193-word (≈1,150 character) story and a
 * 4-shot storyboard on 2026-09-24. They lean high on purpose.
 */

interface WritingRate {
  /** Story → script for a ≈1,150-character story. */
  script: number
  /** Script → storyboard, per shot. */
  storyboardPerShot: number
}

const REFERENCE_STORY_CHARS = 1150

const WRITING_RATES: Record<string, WritingRate> = {
  'claude-opus-5-5': { script: 62, storyboardPerShot: 29 },
  'claude-opus-4-6': { script: 44, storyboardPerShot: 25 },
  'claude-sonnet-5': { script: 24, storyboardPerShot: 12 },
  'gemini-3-flash-preview': { script: 22, storyboardPerShot: 7 },
}

/** Unmeasured models are priced like the most expensive one, so the check never lets a job run short. */
const FALLBACK_RATE = WRITING_RATES['claude-opus-5-5']

function rateFor(model: string | null | undefined): WritingRate {
  const modelId = (model ?? '').split('::').pop() ?? ''
  return WRITING_RATES[modelId] ?? FALLBACK_RATE
}

/** Longer stories cost more to read and write; most of the cost is the fixed prompt and output. */
function lengthFactor(storyChars: number): number {
  return 0.7 + 0.3 * (Math.max(0, storyChars) / REFERENCE_STORY_CHARS)
}

export function estimateScriptWritingCredits(model: string | null | undefined, storyChars: number): number {
  return Math.max(1, Math.round(rateFor(model).script * lengthFactor(storyChars)))
}

export function estimateStoryboardWritingCredits(model: string | null | undefined, shots: number): number {
  return Math.max(1, Math.round(rateFor(model).storyboardPerShot * Math.max(1, shots)))
}

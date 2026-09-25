/**
 * Per-shot dialogue, mood and length (client-safe, no server imports).
 *
 * The storyboard AI writes, for every shot: the lines spoken in it (speaker, words, delivery),
 * a music mood, and a length. The length it picks is never shorter than the dialogue needs,
 * so a video model is not left with spare seconds to fill with invented speech.
 */

import { MAX_SHOT_SECONDS, MIN_SHOT_SECONDS } from './story-length'

export interface ShotDialogueLine {
  speaker: string
  line: string
  /** How it is said, e.g. "shouting, fast" or "cold whisper". */
  delivery: string
}

export const SHOT_MOODS = [
  'tension', 'villain', 'confident', 'anger', 'triumph', 'sad',
  'romantic', 'suspense', 'comedy', 'calm', 'silence',
] as const
export type ShotMood = (typeof SHOT_MOODS)[number]

/** Speaking rate for drama delivery, plus room for a reaction before and after the lines. */
const WORDS_PER_SECOND = 2.5
const PAUSE_BETWEEN_LINES_SECONDS = 0.4
const REACTION_SECONDS = 1.2

const text = (value: unknown) => (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '')

/** Accepts the AI's dialogue array in the shapes it tends to produce and drops empty lines. */
export function normalizeShotDialogue(raw: unknown): ShotDialogueLine[] {
  if (!Array.isArray(raw)) return []
  const lines: ShotDialogueLine[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const line = text(row.line) || text(row.lines) || text(row.text) || text(row.content)
    if (!line) continue
    lines.push({
      speaker: text(row.speaker) || text(row.character) || 'Character',
      line,
      delivery: text(row.delivery) || text(row.parenthetical) || text(row.emotion),
    })
  }
  return lines
}

export function normalizeShotMood(raw: unknown): ShotMood | null {
  const value = text(raw).toLowerCase()
  return (SHOT_MOODS as readonly string[]).includes(value) ? (value as ShotMood) : null
}

function wordCount(line: string): number {
  // CJK has no spaces: count characters as words at roughly the same speaking rate.
  const cjk = line.match(/[㐀-鿿]/g)?.length ?? 0
  const words = line.replace(/[㐀-鿿]/g, ' ').split(/\s+/).filter(Boolean).length
  return words + cjk / 2
}

/** Seconds needed to speak these lines with a short reaction around them (0 when silent). */
export function dialogueSeconds(lines: ShotDialogueLine[]): number {
  if (lines.length === 0) return 0
  const words = lines.reduce((sum, item) => sum + wordCount(item.line), 0)
  return words / WORDS_PER_SECOND + (lines.length - 1) * PAUSE_BETWEEN_LINES_SECONDS + REACTION_SECONDS
}

/** The AI's chosen length, raised to fit the dialogue, as whole seconds within 4–15. */
export function resolveShotDuration(requested: unknown, lines: ShotDialogueLine[]): number {
  const asked = typeof requested === 'number' && Number.isFinite(requested) ? requested : Number(requested)
  const base = Number.isFinite(asked) && asked > 0 ? asked : MIN_SHOT_SECONDS
  const needed = Math.ceil(dialogueSeconds(lines))
  return Math.min(MAX_SHOT_SECONDS, Math.max(MIN_SHOT_SECONDS, Math.round(base), needed))
}

type PanelLike = Record<string, unknown> & { panel_number?: number; duration?: number }

/**
 * Cleans the AI's per-shot fields in place of the raw values: dialogue list, mood, music hit
 * and a length that fits the dialogue.
 */
export function normalizeShotFields<T extends PanelLike>(panel: T): T {
  const dialogue = normalizeShotDialogue(panel.dialogue)
  return {
    ...panel,
    dialogue,
    mood: normalizeShotMood(panel.mood),
    music_hit: panel.music_hit === true,
    duration: resolveShotDuration(panel.duration, dialogue),
  }
}

/**
 * The detail pass rewrites panels and may drop the plan's dialogue, mood or length. Copies
 * them back from the plan panel with the same number (or position).
 */
export function carryShotFields<T extends PanelLike>(finalPanels: T[], planPanels: PanelLike[]): T[] {
  const byNumber = new Map(planPanels.map((panel, index) => [panel.panel_number ?? index + 1, panel]))
  return finalPanels.map((panel, index) => {
    const plan = byNumber.get(panel.panel_number ?? index + 1) ?? planPanels[index]
    if (!plan) return normalizeShotFields(panel)
    const hasDialogue = Array.isArray(panel.dialogue) && panel.dialogue.length > 0
    return normalizeShotFields({
      ...panel,
      dialogue: hasDialogue ? panel.dialogue : plan.dialogue,
      mood: panel.mood ?? plan.mood,
      music_hit: panel.music_hit ?? plan.music_hit,
      duration: panel.duration ?? plan.duration,
    })
  })
}

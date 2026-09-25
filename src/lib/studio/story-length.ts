import { estimateScriptWritingCredits, estimateStoryboardWritingCredits } from './writing-cost'

/**
 * Story length control (client-safe, no server imports).
 *
 * A project may set a target runtime (15/30/60/90s). The pipeline plans about
 * round(target / AVERAGE_SHOT_SECONDS) shots: the clip split is capped, each clip gets a time
 * budget (stored in StudioClip.duration), the screenplay is fitted to it, and the storyboard
 * plans at most that many panels. Each panel's own length (4–15s) is chosen by the storyboard
 * AI from its dialogue and action (see shot-dialogue.ts).
 * Projects without a target keep the original, unconstrained behaviour.
 */

export const STORY_LENGTH_OPTIONS = [15, 30, 60, 90] as const
export const DEFAULT_TARGET_SECONDS = 30

export const MIN_SHOT_SECONDS = 4
export const MAX_SHOT_SECONDS = 15
/** Average shot length used to plan how many shots a story gets; real lengths vary per shot. */
export const AVERAGE_SHOT_SECONDS = 6

/** Average speaking rate used to budget dialogue. */
const WORDS_PER_SECOND = 2.5
/** Share of screen time with someone speaking: short dramas are dialogue-driven. */
const DIALOGUE_SHARE = 0.7

export function isValidTargetSeconds(value: unknown): value is number {
  return typeof value === 'number' && (STORY_LENGTH_OPTIONS as readonly number[]).includes(value)
}

export function isValidShotSeconds(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= MIN_SHOT_SECONDS && value <= MAX_SHOT_SECONDS
}

export interface StoryLengthPlan {
  targetSeconds: number
  shotSeconds: number
}

/**
 * The project's plan, or null when length control is off (legacy / unset projects).
 * A shot length stored by older projects is ignored: shots now get their own lengths.
 */
export function resolveStoryLengthPlan(project: { targetDurationSec?: number | null }): StoryLengthPlan | null {
  if (!isValidTargetSeconds(project.targetDurationSec ?? undefined)) return null
  return { targetSeconds: project.targetDurationSec!, shotSeconds: AVERAGE_SHOT_SECONDS }
}

export function totalShots(plan: StoryLengthPlan): number {
  return Math.max(1, Math.round(plan.targetSeconds / plan.shotSeconds))
}

export function dialogueWordBudget(seconds: number): number {
  return Math.max(4, Math.round(seconds * WORDS_PER_SECOND))
}

/**
 * Shares the shots between clips in proportion to their text length (every clip gets at
 * least one). Requires clipWeights.length <= total shots; merge clips first otherwise.
 */
export function distributeShots(clipWeights: number[], shots: number): number[] {
  if (clipWeights.length === 0) return []
  if (clipWeights.length > shots) throw new Error('STORY_LENGTH_TOO_MANY_CLIPS')
  const weights = clipWeights.map((weight) => Math.max(1, weight))
  const total = weights.reduce((sum, weight) => sum + weight, 0)
  // Largest-remainder apportionment with a minimum of one shot per clip.
  const exact = weights.map((weight) => (weight / total) * shots)
  const allocation = exact.map((value) => Math.max(1, Math.floor(value)))
  let remaining = shots - allocation.reduce((sum, value) => sum + value, 0)
  const byRemainder = exact.map((value, index) => ({ index, rest: value - Math.floor(value) })).sort((a, b) => b.rest - a.rest)
  for (const { index } of byRemainder) {
    if (remaining <= 0) break
    allocation[index] += 1
    remaining -= 1
  }
  // Minimum-one bumps can overshoot: take back from the clips with the most shots.
  while (remaining < 0) {
    const largest = allocation.indexOf(Math.max(...allocation))
    allocation[largest] -= 1
    remaining += 1
  }
  return allocation
}

/** Merges neighbouring items (smallest combined weight first) until at most `max` remain. */
export function mergeAdjacentToLimit<T>(items: T[], max: number, weight: (item: T) => number, merge: (a: T, b: T) => T): T[] {
  const result = [...items]
  const limit = Math.max(1, max)
  while (result.length > limit) {
    let best = 0
    for (let index = 1; index < result.length - 1; index += 1) {
      if (weight(result[index]) + weight(result[index + 1]) < weight(result[best]) + weight(result[best + 1])) best = index
    }
    result.splice(best, 2, merge(result[best], result[best + 1]))
  }
  return result
}

/** Nearest duration a video model accepts (e.g. Kling: 5 or 10). */
export function snapToAllowedDuration(seconds: number, allowed: readonly number[] | undefined): number {
  const options = (allowed || []).filter((value) => Number.isFinite(value))
  if (options.length === 0) return seconds
  return options.reduce((best, option) => (Math.abs(option - seconds) < Math.abs(best - seconds) ? option : best))
}

type Locale = string | undefined

function isZh(locale: Locale): boolean {
  return typeof locale === 'string' && locale.toLowerCase().startsWith('zh')
}

export function buildClipSplitDirective(locale: Locale, plan: StoryLengthPlan): string {
  const shots = totalShots(plan)
  if (isZh(locale)) {
    return `\n\n【时长要求】成片目标时长约 ${plan.targetSeconds} 秒（共 ${shots} 个镜头，每个约 ${plan.shotSeconds} 秒）。片段数量不得超过 ${shots} 个，宁少勿多；按最重要的剧情节点切分。`
  }
  return `\n\nLENGTH REQUIREMENT: the finished video must run about ${plan.targetSeconds} seconds in total (${shots} shots of about ${plan.shotSeconds} seconds each). Return at most ${shots} clips — fewer is better. Split only at the most important story beats.`
}

export function buildScreenplayDirective(locale: Locale, input: { clipSeconds: number; shots: number; shotSeconds: number }): string {
  const words = Math.max(6, Math.round(input.clipSeconds * WORDS_PER_SECOND * DIALOGUE_SHARE))
  const max = dialogueWordBudget(input.clipSeconds)
  if (isZh(locale)) {
    return `\n\n【时长要求】本片段在成片中约 ${input.clipSeconds} 秒（约 ${input.shots} 个镜头）。以对白推动剧情：台词合计约 ${words} 个字（不超过 ${max}），大多数镜头都要有人说话；删掉次要描写。`
  }
  return `\n\nLENGTH REQUIREMENT: this part plays for about ${input.clipSeconds} seconds on screen (about ${input.shots} shot(s)). Tell it through dialogue: aim for about ${words} words of spoken lines in total (never more than ${max}), so most shots have someone speaking. Drop minor description.`
}

export function buildStoryboardDirective(locale: Locale, input: { panelBudget: number; clipSeconds: number; overBy?: number }): string {
  if (isZh(locale)) {
    const retry = input.overBy ? `上一次输出多了 ${input.overBy} 个分镜，请合并相邻分镜。` : ''
    return `\n\n【时长要求】${retry}本片段最多规划 ${input.panelBudget} 个分镜（不可多于此数），所有分镜的 "duration" 合计约 ${input.clipSeconds} 秒。每个分镜的时长（4–15 秒）按内容决定：有台词的分镜要足够把话说完（约每秒 2.5 个词再加 1 秒反应），无台词的反应或空镜 4–5 秒。`
  }
  const retry = input.overBy ? `Your previous answer had ${input.overBy} panel(s) too many — merge neighbouring panels. ` : ''
  return `\n\nLENGTH REQUIREMENT: ${retry}Plan at most ${input.panelBudget} panel(s) for this clip — never more — and make their "duration" values add up to about ${input.clipSeconds} seconds. Choose each panel's duration (4–15 seconds) from its content: long enough for its dialogue (about 2.5 words per second plus a second of reaction); silent reactions and establishing shots 4–5 seconds.`
}

/** Merges storyboard plan panels down to the budget without dropping any beat. */
export function mergePanelsToBudget<T extends Record<string, unknown>>(panels: T[], budget: number): T[] {
  const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '')
  const join = (a: unknown, b: unknown, separator: string) => [text(a), text(b)].filter(Boolean).join(separator)
  const merged = mergeAdjacentToLimit(
    panels,
    budget,
    (panel) => text(panel.description).length + text(panel.source_text).length,
    (a, b) => ({
      ...a,
      description: join(a.description, b.description, ' Then '),
      source_text: join(a.source_text, b.source_text, ' '),
      video_prompt: join(a.video_prompt, b.video_prompt, ', then '),
      dialogue: [...(Array.isArray(a.dialogue) ? a.dialogue : []), ...(Array.isArray(b.dialogue) ? b.dialogue : [])],
      duration: Math.min(MAX_SHOT_SECONDS, (Number(a.duration) || 0) + (Number(b.duration) || 0)) || undefined,
      mood: a.mood ?? b.mood,
      music_hit: a.music_hit === true || b.music_hit === true,
      characters: [...(Array.isArray(a.characters) ? a.characters : []), ...(Array.isArray(b.characters) ? b.characters : [])]
        .filter((item, index, all) => all.findIndex((other) => JSON.stringify(other) === JSON.stringify(item)) === index),
    }),
  )
  return merged.map((panel, index) => ({ ...panel, panel_number: index + 1 }))
}

/** Client-side cost estimate (NucleusArt credits). Rates per second at 5 credits per EvoLink credit. */
export const VIDEO_CREDITS_PER_SECOND: Record<string, { '480p': number; '720p': number }> = {
  'seedance-2.0': { '480p': 31.39, '720p': 67.5 },
  'seedance-2.5': { '480p': 46.71, '720p': 100.45 },
}
const IMAGE_CREDITS_PER_SHOT = 25

/** Typical first story (~200 words); used when the story text is not known yet. */
const TYPICAL_STORY_CHARS = 1150

/** The whole drama: writing (per the chosen writing model, see writing-cost.ts), a picture per shot, and video. */
export function estimateStoryCredits(
  plan: StoryLengthPlan,
  videoModelId = 'seedance-2.0',
  storyChars = TYPICAL_STORY_CHARS,
  analysisModel?: string | null,
): { shots: number; low: number; high: number } | null {
  const rates = VIDEO_CREDITS_PER_SECOND[videoModelId]
  if (!rates) return null
  const shots = totalShots(plan)
  const seconds = shots * plan.shotSeconds
  const fixed = shots * IMAGE_CREDITS_PER_SHOT
    + estimateScriptWritingCredits(analysisModel, storyChars)
    + estimateStoryboardWritingCredits(analysisModel, shots)
  return {
    shots,
    low: Math.round(seconds * rates['480p'] + fixed),
    high: Math.round(seconds * rates['720p'] + fixed),
  }
}

import { estimateScriptWritingCredits, estimateStoryboardWritingCredits } from './writing-cost'

/**
 * Story length control (client-safe, no server imports).
 *
 * A project may set a target runtime (15/30/60/90s) and a shot length (4–15s). The
 * pipeline then plans round(target / shot) shots: the clip split is capped, each clip gets
 * a time budget (stored in StudioClip.duration), the screenplay is condensed to fit, and the
 * storyboard plans exactly that many panels, each lasting the shot length.
 * Projects without a target keep the original, unconstrained behaviour.
 */

export const STORY_LENGTH_OPTIONS = [15, 30, 60, 90] as const
export const DEFAULT_TARGET_SECONDS = 30

export const MIN_SHOT_SECONDS = 4
export const MAX_SHOT_SECONDS = 15
export const DEFAULT_SHOT_SECONDS = 8

export const SHOT_LENGTH_PRESETS = [
  { id: 'quick', seconds: 4, label: 'Quick cuts', hint: 'Action, trailers, fast edits' },
  { id: 'standard', seconds: 6, label: 'Standard', hint: 'Balanced pacing' },
  { id: 'long', seconds: 8, label: 'Long takes', hint: 'Fewer images, smoother continuity' },
  { id: 'scene', seconds: 12, label: 'One shot per scene', hint: 'Dialogue scenes, cinematic feel' },
] as const

/** Average speaking rate used to budget dialogue. */
const WORDS_PER_SECOND = 2.5

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

/** The project's plan, or null when length control is off (legacy / unset projects). */
export function resolveStoryLengthPlan(project: { targetDurationSec?: number | null; shotLengthSec?: number | null }): StoryLengthPlan | null {
  if (!isValidTargetSeconds(project.targetDurationSec ?? undefined)) return null
  const shotSeconds = isValidShotSeconds(project.shotLengthSec ?? undefined) ? project.shotLengthSec! : DEFAULT_SHOT_SECONDS
  return { targetSeconds: project.targetDurationSec!, shotSeconds }
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
  const words = dialogueWordBudget(input.clipSeconds)
  if (isZh(locale)) {
    return `\n\n【时长要求】本片段在成片中只占约 ${input.clipSeconds} 秒（${input.shots} 个镜头，每个约 ${input.shotSeconds} 秒）。请压缩内容，只保留关键情节与对白；全部台词合计不超过约 ${words} 个词/字，删掉次要描写。`
  }
  return `\n\nLENGTH REQUIREMENT: this part plays for only about ${input.clipSeconds} seconds on screen (${input.shots} shot(s) of about ${input.shotSeconds} seconds). Condense it: keep only the key beats and lines. All spoken dialogue together must stay under about ${words} words. Drop minor details.`
}

export function buildStoryboardDirective(locale: Locale, input: { panelBudget: number; shotSeconds: number; overBy?: number }): string {
  if (isZh(locale)) {
    const retry = input.overBy ? `上一次输出多了 ${input.overBy} 个分镜，请合并相邻分镜。` : ''
    return `\n\n【时长要求】${retry}本片段必须恰好规划 ${input.panelBudget} 个分镜（不可多于此数），每个分镜时长 ${input.shotSeconds} 秒，"duration" 字段填 ${input.shotSeconds}。每个分镜应是一个连贯的长镜头，可包含多个动作与完整对白。`
  }
  const retry = input.overBy ? `Your previous answer had ${input.overBy} panel(s) too many — merge neighbouring panels. ` : ''
  return `\n\nLENGTH REQUIREMENT: ${retry}Plan exactly ${input.panelBudget} panel(s) for this clip — never more. Each panel is one continuous ${input.shotSeconds}-second shot; set "duration" to ${input.shotSeconds}. A panel may contain several actions and complete lines of dialogue.`
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

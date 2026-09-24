/**
 * Sound-on video generation: tell the video model exactly what is said in the shot.
 *
 * Without this, models with native audio (Seedance) invent their own lines — including in
 * shots that should be silent. With sound off the prompt is left untouched (voice + lip sync
 * are handled separately).
 */

export interface PanelDialogueLine {
  speaker: string
  content: string
}

const QUOTE_PATTERN = /["“”「」『』]/

function clean(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

export function buildVideoAudioDirective(input: {
  /** Lines matched to this panel by the voice step. */
  lines: PanelDialogueLine[]
  /** Whether the episode has any voice lines (i.e. the voice step has been run). */
  episodeHasVoiceLines: boolean
  /** The panel's source text, used when the voice step hasn't been run. */
  sourceText?: string | null
}): string {
  const lines = input.lines
    .map((line) => ({ speaker: clean(line.speaker), content: clean(line.content) }))
    .filter((line) => line.content)

  if (lines.length > 0) {
    const spoken = lines.map((line) => `${line.speaker || 'Character'}: "${line.content}"`).join(' ')
    return `\n\nDialogue in this shot, spoken exactly as written and in this order, with lip movement matching the speaker: ${spoken} No other speech.`
  }

  if (!input.episodeHasVoiceLines) {
    const source = clean(input.sourceText || '')
    if (source && QUOTE_PATTERN.test(source)) {
      return `\n\nSpeak only the quoted dialogue from this scene text, exactly as written, with lip movement matching the speaker: ${source} Do not add any other speech.`
    }
  }

  return '\n\nNo spoken dialogue in this shot: ambient sound and sound effects only. Characters do not talk.'
}

/** Sound is on when the request says so, or when it's unset and the model's default is on. */
export function isSoundOn(requested: boolean | undefined, modelDefaultOptions: unknown): boolean {
  if (typeof requested === 'boolean') return requested
  return Array.isArray(modelDefaultOptions) && modelDefaultOptions[0] === true
}

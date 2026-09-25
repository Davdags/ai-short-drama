import type { ScorePlan } from './score-plan'

/**
 * ffmpeg arguments that lay the background score under a merged episode (pure, testable).
 *
 * Levels were tuned on real episodes: music sits 9–16 dB under the dialogue, ducks further
 * whenever someone speaks, and each mood change blends over 0.2s instead of cutting hard.
 */

/** Music level before ducking (the cue's own loudness varies; Suno masters loud). */
const MUSIC_VOLUME = 0.4
const HIT_VOLUME = 0.5
const BLEND_SECONDS = 0.2
/** Skip the start of each cue: Suno intros are often quiet or out of mood. */
const CUE_START_SECONDS = 8

/** Falling sub-bass thump used for music hits (no extra asset needed). */
const HIT_SOURCE = "aevalsrc='0.95*sin(2*PI*(62-30*t)*t)*exp(-3.2*t)':s=48000:d=1.4"

export function buildScoreMixArgs(input: {
  mergedFile: string
  /** mood → local audio file of its cue. Moods without a file are left silent. */
  cueFiles: Record<string, string>
  plan: ScorePlan
  outputFile: string
}): string[] | null {
  const segments = input.plan.segments.filter((segment) => input.cueFiles[segment.mood])
  if (segments.length === 0 && input.plan.hits.length === 0) return null

  const args: string[] = ['-i', input.mergedFile]
  const parts: string[] = []
  const labels: string[] = []
  // Each mood picks up where it left off the last time it played, so a returning mood
  // doesn't restart the same bar.
  const moodOffset = new Map<string, number>()

  segments.forEach((segment) => {
    const offset = moodOffset.get(segment.mood) ?? CUE_START_SECONDS
    moodOffset.set(segment.mood, offset + segment.duration)
    const length = segment.duration + BLEND_SECONDS
    args.push('-stream_loop', '-1', '-ss', offset.toFixed(3), '-t', length.toFixed(3), '-i', input.cueFiles[segment.mood])
    const index = labels.length + 1
    const fadeOut = Math.max(0, length - BLEND_SECONDS).toFixed(3)
    parts.push(
      `[${index}:a]aresample=48000,aformat=channel_layouts=stereo,volume=${MUSIC_VOLUME},` +
      `afade=t=in:st=0:d=${BLEND_SECONDS},afade=t=out:st=${fadeOut}:d=${BLEND_SECONDS},` +
      `adelay=${Math.round(Math.max(0, segment.start - BLEND_SECONDS / 2) * 1000)}:all=1[m${index}]`,
    )
    labels.push(`[m${index}]`)
  })

  input.plan.hits.forEach((time) => {
    args.push('-f', 'lavfi', '-i', HIT_SOURCE)
    const index = labels.length + 1
    parts.push(`[${index}:a]aformat=channel_layouts=stereo,volume=${HIT_VOLUME},adelay=${Math.round(time * 1000)}:all=1[m${index}]`)
    labels.push(`[m${index}]`)
  })

  const filter = [
    ...parts,
    `${labels.join('')}amix=inputs=${labels.length}:duration=longest:normalize=0[mus]`,
    '[0:a]aresample=48000,aformat=channel_layouts=stereo,volume=1.5,asplit=2[dlg][key]',
    '[mus][key]sidechaincompress=threshold=0.02:ratio=6:attack=10:release=450[duck]',
    '[dlg][duck]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-14:TP=-1:LRA=11[aout]',
  ].join(';')

  return [
    ...args,
    '-filter_complex', filter,
    '-map', '0:v', '-map', '[aout]',
    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
    '-movflags', '+faststart',
    '-y', input.outputFile,
  ]
}

/**
 * Background score for a finished episode (pure, no I/O).
 *
 * Every shot carries a mood from the storyboard. Consecutive shots with the same mood share one
 * continuous stretch of that mood's music; the music changes with the cut when the mood does,
 * stops for "silence" shots, and a hit lands on the biggest reveal / cliffhanger shots.
 */

export interface ScoredShot {
  /** Seconds this shot lasts in the merged video. */
  duration: number
  mood: string | null
  musicHit: boolean
}

export interface MusicSegment {
  mood: string
  /** Where the segment starts in the merged video (s). */
  start: number
  duration: number
}

export interface ScorePlan {
  segments: MusicSegment[]
  /** Times (s) where an impact hit plays. */
  hits: number[]
  /** Moods that need a music cue. */
  moods: string[]
}

export const SILENCE_MOOD = 'silence'
/** Shots with no mood keep the previous shot's music (or this one at the very start). */
const DEFAULT_MOOD = 'tension'

export function buildScorePlan(shots: ScoredShot[]): ScorePlan {
  const segments: MusicSegment[] = []
  const hits: number[] = []
  let time = 0
  let previousMood = DEFAULT_MOOD
  for (const shot of shots) {
    const duration = Math.max(0, shot.duration)
    const mood = shot.mood || previousMood
    if (shot.musicHit) hits.push(round(time))
    if (mood !== SILENCE_MOOD && duration > 0) {
      const last = segments[segments.length - 1]
      if (last && last.mood === mood && Math.abs(last.start + last.duration - time) < 0.01) {
        last.duration = round(last.duration + duration)
      } else {
        segments.push({ mood, start: round(time), duration: round(duration) })
      }
    }
    previousMood = mood
    time += duration
  }
  return { segments, hits, moods: [...new Set(segments.map((segment) => segment.mood))] }
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000
}

/** Suno style prompt per mood: instrumental drama underscore that starts straight away. */
export const MOOD_MUSIC_STYLES: Record<string, string> = {
  tension: 'Tense cinematic drama underscore, low urgent pulse, staccato strings, building anxiety, leaves room for dialogue, starts immediately with no intro, instrumental',
  villain: 'Menacing villain entrance music, heavy cinematic drums and dark brass stabs, powerful and threatening, starts immediately with no intro, instrumental',
  confident: 'Confident sassy boss groove, slick funky bassline, finger snaps, cool swagger, playful and smug, starts immediately with no intro, 100 bpm, instrumental',
  anger: 'Fast angry cinematic confrontation music, driving strings ostinato, pounding drums, relentless rage, starts immediately with no intro, instrumental',
  triumph: 'Triumphant empowering cinematic strings, heroic rising build, the hero wins, proud and uplifting, starts immediately with no intro, instrumental',
  sad: 'Sad emotional drama underscore, soft piano and warm strings, heartbreak, slow and tender, starts immediately with no intro, instrumental',
  romantic: 'Romantic drama underscore, gentle piano, warm strings, tender and hopeful, starts immediately with no intro, instrumental',
  suspense: 'Creepy psychological suspense score, high string tremolo, slow heartbeat, low drone, creeping dread, quiet and unsettling, instrumental',
  comedy: 'Light comedic drama underscore, playful pizzicato strings, bouncy woodwinds, cheeky and fun, starts immediately with no intro, instrumental',
  calm: 'Calm gentle drama underscore, soft ambient pads and light piano, peaceful, starts immediately with no intro, instrumental',
}

export function isScorableMood(mood: string): boolean {
  return Object.prototype.hasOwnProperty.call(MOOD_MUSIC_STYLES, mood)
}

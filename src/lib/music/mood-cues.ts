import { prisma } from '@/lib/prisma'
import { uploadObject } from '@/lib/storage'
import { getProviderConfig } from '@/lib/api-config'
import { generateSunoMusic } from '@/lib/providers/evolink/suno-music'
import { createScopedLogger } from '@/lib/logging/core'
import { MOOD_MUSIC_STYLES, isScorableMood } from './score-plan'

const logger = createScopedLogger({ module: 'music.mood_cues' })

/** mood → storage key of that mood's music for the episode. */
export type MoodCueMap = Record<string, string>

function parseCueMap(raw: string | null | undefined): MoodCueMap {
  if (!raw) return {}
  try {
    const value = JSON.parse(raw) as unknown
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
    return Object.fromEntries(Object.entries(value).filter(([, key]) => typeof key === 'string')) as MoodCueMap
  } catch {
    return {}
  }
}

async function generateCue(mood: string, episodeId: string, apiKey: string): Promise<string | null> {
  const result = await generateSunoMusic({
    model: 'suno-v5-beta',
    custom_mode: true,
    instrumental: true,
    title: `${mood} cue`,
    style: MOOD_MUSIC_STYLES[mood],
  }, apiKey)
  const url = result.success ? result.songs?.[0]?.audio_url : null
  if (!url) {
    logger.warn({ action: 'music.cue.failed', message: result.error || 'no song', details: { mood, episodeId } })
    return null
  }
  const response = await fetch(url)
  if (!response.ok) throw new Error(`MUSIC_CUE_DOWNLOAD_FAILED(${response.status})`)
  const key = `music/${episodeId}/${mood}.mp3`
  await uploadObject(Buffer.from(await response.arrayBuffer()), key, 3, 'audio/mpeg')
  return key
}

/**
 * Makes sure the episode has one music cue per mood (generated once with Suno, then reused on
 * every re-merge). Moods that fail to generate are left out; the rest still play.
 */
export async function ensureMoodCues(input: { episodeId: string; userId: string; moods: string[] }): Promise<MoodCueMap> {
  const episode = await prisma.studioEpisode.findUnique({ where: { id: input.episodeId }, select: { musicCues: true } })
  const cues = parseCueMap(episode?.musicCues)
  const missing = input.moods.filter((mood) => isScorableMood(mood) && !cues[mood])
  if (missing.length === 0) return cues

  const { apiKey } = await getProviderConfig(input.userId, 'evolink')
  const results = await Promise.all(missing.map(async (mood) => {
    try {
      return [mood, await generateCue(mood, input.episodeId, apiKey)] as const
    } catch (error) {
      logger.warn({ action: 'music.cue.failed', message: error instanceof Error ? error.message : String(error), details: { mood } })
      return [mood, null] as const
    }
  }))
  for (const [mood, key] of results) if (key) cues[mood] = key
  await prisma.studioEpisode.update({ where: { id: input.episodeId }, data: { musicCues: JSON.stringify(cues) } })
  return cues
}

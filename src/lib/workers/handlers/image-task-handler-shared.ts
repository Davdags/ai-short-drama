import { type Job } from 'bullmq'
import { prisma } from '@/lib/prisma'
import { type TaskJobData } from '@/lib/task/types'
import { decodeImageUrlsFromDb } from '@/lib/contracts/image-urls-contract'
import {
  resolveImageSourceFromGeneration,
  toSignedUrlIfCos,
  uploadImageSourceToCos,
  withLabelBar,
} from '../utils'

export type AnyObj = Record<string, unknown>

interface CharacterAppearanceLike {
  appearanceIndex?: number
  changeReason: string | null
  description?: string | null
  descriptions?: string | null
  imageUrls: string | null
  imageUrl: string | null
  selectedIndex: number | null
}

interface CharacterLike {
  name: string
  appearances?: CharacterAppearanceLike[]
}

interface LocationImageLike {
  description?: string | null
  imageIndex?: number
  isSelected: boolean
  imageUrl: string | null
}

interface LocationLike {
  name: string
  images?: LocationImageLike[]
}

interface NovelProjectData {
  videoRatio?: string | null
  characters?: CharacterLike[]
  locations?: LocationLike[]
}

interface PanelLike {
  sketchImageUrl?: string | null
  characters?: string | null
  location?: string | null
}

export interface PanelCharacterReference {
  name: string
  appearance?: string
}

interface NovelDataDb {
  studioProject: {
    findUnique(args: Record<string, unknown>): Promise<NovelProjectData | null>
  }
}

export function parseJsonStringArray(value: unknown): string[] {
  if (!value) return []
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string')
  }
  if (typeof value !== 'string') return []
  try {
    const parsed = JSON.parse(value)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item): item is string => typeof item === 'string')
  } catch {
    return []
  }
}

export function parseImageUrls(value: string | null | undefined, fieldName: string): string[] {
  return decodeImageUrlsFromDb(value, fieldName)
}

export function clampCount(value: unknown, min: number, max: number, fallback: number) {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.max(min, Math.min(max, Math.floor(n)))
}

export function pickFirstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value
  }
  return null
}

export async function generateLabeledImageToCos(params: {
  job: Job<TaskJobData>
  userId: string
  modelId: string
  prompt: string
  label: string
  targetId: string
  keyPrefix: string
  options?: {
    referenceImages?: string[]
    aspectRatio?: string
    size?: string
  }
}) {
  const source = await resolveImageSourceFromGeneration(params.job, {
    userId: params.userId,
    modelId: params.modelId,
    prompt: params.prompt,
    options: params.options,
  })

  const labeled = await withLabelBar(source, params.label)
  const cosKey = await uploadImageSourceToCos(labeled, params.keyPrefix, params.targetId)
  return cosKey
}

export async function resolveNovelData(projectId: string) {
  const db = prisma as unknown as NovelDataDb
  const data = await db.studioProject.findUnique({
    where: { projectId },
    include: {
      characters: { include: { appearances: { orderBy: { appearanceIndex: 'asc' } } } },
      locations: { include: { images: { orderBy: { imageIndex: 'asc' } } } },
    },
  })

  if (!data) {
    throw new Error(`StudioProject not found: ${projectId}`)
  }

  return data
}

export function parsePanelCharacterReferences(value: string | null | undefined): PanelCharacterReference[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((item: unknown) => {
        if (typeof item === 'string') return { name: item }
        if (!item || typeof item !== 'object') return null
        const candidate = item as { name?: unknown; appearance?: unknown }
        if (typeof candidate.name === 'string') {
          return {
            name: candidate.name,
            appearance: typeof candidate.appearance === 'string' ? candidate.appearance : undefined,
          }
        }
        return null
      })
      .filter(Boolean) as PanelCharacterReference[]
  } catch {
    return []
  }
}

/**
 * 按角色名查找角色（支持别名匹配）
 * 优先级：1. 精确全名匹配  2. 按 '/' 拆分后别名精确匹配
 * 例：引用名 "顾娘子" 可匹配角色 "顾娘子/顾盼之"
 */
/**
 * Compares asset names the way people read them: the AI often writes a curly apostrophe
 * ("Okafor’s Office") where the asset was saved with a straight one ("Okafor's Office").
 */
export function normalizeAssetName(name: string): string {
  return name
    .replace(/[‘’‛`´]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .trim()
}

export function sameAssetName(a: string, b: string): boolean {
  return normalizeAssetName(a) === normalizeAssetName(b)
}

/**
 * The storyboard writer often appends a description to the location name
 * ("Okafor's Office — corner office with glass walls"), so a panel location also matches
 * when it starts with the asset name followed by punctuation or a space.
 */
export function matchesLocationName(assetName: string, panelLocation: string): boolean {
  const name = normalizeAssetName(assetName)
  const location = normalizeAssetName(panelLocation)
  if (!name || !location) return false
  if (location === name) return true
  return location.startsWith(name) && !/[\p{L}\p{N}]/u.test(location.charAt(name.length))
}

export function findCharacterByName<T extends { name: string }>(characters: T[], referenceName: string): T | undefined {
  const refLower = normalizeAssetName(referenceName)
  if (!refLower) return undefined

  // 优先级 1：精确全名匹配
  const exact = characters.find((c) => normalizeAssetName(c.name) === refLower)
  if (exact) return exact

  // 优先级 2：别名匹配 — 按 '/' 拆分后任一别名精确匹配
  const refAliases = refLower.split('/').map((s) => s.trim()).filter(Boolean)
  for (const character of characters) {
    const charAliases = normalizeAssetName(character.name).split('/').map((s) => s.trim()).filter(Boolean)
    const hasOverlap = refAliases.some((refAlias) => charAliases.includes(refAlias))
    if (hasOverlap) return character
  }

  return undefined
}

export interface PanelReferenceImage {
  url: string
  /** What the picture is, so the prompt can tell the model which reference is which person or place. */
  label: string
  kind: 'sketch' | 'character' | 'location'
  /** Asset name for characters and locations. */
  name?: string
}

export async function collectPanelReferenceImages(projectData: NovelProjectData, panel: PanelLike) {
  return (await collectLabeledPanelReferenceImages(projectData, panel)).map((ref) => ref.url)
}

export async function collectLabeledPanelReferenceImages(projectData: NovelProjectData, panel: PanelLike): Promise<PanelReferenceImage[]> {
  const refs: PanelReferenceImage[] = []

  const sketch = toSignedUrlIfCos(panel.sketchImageUrl, 3600)
  if (sketch) refs.push({ url: sketch, label: 'rough sketch of this panel composition', kind: 'sketch' })

  const panelCharacters = parsePanelCharacterReferences(panel.characters)
  for (const item of panelCharacters) {
    const character = findCharacterByName(projectData.characters || [], item.name)
    if (!character) continue

    const appearances = character.appearances || []
    let appearance = appearances[0]
    if (item.appearance) {
      const matched = appearances.find((a) => (a.changeReason || '').toLowerCase() === item.appearance!.toLowerCase())
      if (matched) appearance = matched
    }

    if (!appearance) continue

    const imageUrls = parseImageUrls(appearance.imageUrls, 'characterAppearance.imageUrls')
    const selectedIndex = appearance.selectedIndex
    const selectedUrl = selectedIndex !== null && selectedIndex !== undefined ? imageUrls[selectedIndex] : null
    const key = selectedUrl || imageUrls[0] || appearance.imageUrl
    const signed = toSignedUrlIfCos(key, 3600)
    if (signed) refs.push({ url: signed, label: `character ${character.name}`, kind: 'character', name: character.name })
  }

  if (panel.location) {
    const location = (projectData.locations || []).find((loc) => matchesLocationName(loc.name, panel.location!))
    if (location) {
      const images = location.images || []
      const selected = images.find((img) => img.isSelected && img.imageUrl) || images.find((img) => img.imageUrl)
      const signed = toSignedUrlIfCos(selected?.imageUrl, 3600)
      if (signed) refs.push({ url: signed, label: `location ${location.name}`, kind: 'location', name: location.name })
    }
  }

  return refs
}

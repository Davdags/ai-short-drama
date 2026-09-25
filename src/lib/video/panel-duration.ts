import { resolveBuiltinCapabilitiesByModelKey } from '@/lib/model-capabilities/lookup'
import { snapToAllowedDuration } from '@/lib/studio/story-length'

type Body = Record<string, unknown>

const isRecord = (value: unknown): value is Body => !!value && typeof value === 'object' && !Array.isArray(value)

function videoModelKey(body: Body): string | null {
  const key = typeof body.videoModel === 'string' ? body.videoModel.trim() : ''
  return key || null
}

/**
 * "Generate all": each shot keeps its own length (chosen by the storyboard from its dialogue),
 * snapped to what the model allows, instead of one length for every shot.
 */
export function withPanelDuration(body: Body, panelDuration: number | null | undefined): Body {
  if (typeof panelDuration !== 'number' || !Number.isFinite(panelDuration) || panelDuration <= 0) return body
  const modelKey = videoModelKey(body)
  const videoCaps = modelKey ? resolveBuiltinCapabilitiesByModelKey('video', modelKey)?.video : null
  const durationOptions = (videoCaps as { durationOptions?: unknown } | null | undefined)?.durationOptions
  if (!Array.isArray(durationOptions) || durationOptions.length === 0) return body
  const options = isRecord(body.generationOptions) ? body.generationOptions : {}
  return {
    ...body,
    generationOptions: { ...options, duration: snapToAllowedDuration(Math.ceil(panelDuration), durationOptions as number[]) },
  }
}

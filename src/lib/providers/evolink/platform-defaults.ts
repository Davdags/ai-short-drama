import { prisma } from '@/lib/prisma'
import { isCentralEvolinkEnabled } from './central'

/**
 * Starting model choices for new accounts on the central EvoLink account.
 * Users can change every one of them in Settings → Model preferences.
 */
/**
 * Writing model for new (free) accounts. Measured 2026-09-24 on a 193-word story:
 * Gemini 3 Flash wrote script + 4-shot storyboard for ~46 credits, Opus 5.5 for ~178.
 */
export const TRIAL_ANALYSIS_MODEL = 'evolink::gemini-3-flash-preview'
/** Writing model once the customer pays. */
export const PAID_ANALYSIS_MODEL = 'evolink::claude-opus-5-5'

export const PLATFORM_DEFAULT_MODELS = {
  analysisModel: TRIAL_ANALYSIS_MODEL,
  characterModel: 'evolink::gpt-image-2',
  locationModel: 'evolink::gpt-image-2',
  storyboardModel: 'evolink::gpt-image-2',
  editModel: 'evolink::gpt-image-2',
  videoModel: 'evolink::seedance-2.0',
  audioModel: 'evolink::qwen3-tts-vd',
  lipSyncModel: 'evolink::videoretalk',
  voiceDesignModel: 'evolink::qwen-voice-design',
} as const

/**
 * Generated audio on: Seedance speaks each shot's exact lines (from the storyboard) and stays
 * silent afterwards, because every shot is only as long as its dialogue needs.
 */
export const PLATFORM_DEFAULT_CAPABILITIES = {
  'evolink::seedance-2.0': { generateAudio: true },
  'evolink::seedance-2.5': { generateAudio: true },
}

/** The previous defaults (audio off). Accounts still on them untouched are moved to the new ones. */
const PREVIOUS_DEFAULT_CAPABILITIES = JSON.stringify({
  'evolink::seedance-2.0': { generateAudio: false },
  'evolink::seedance-2.5': { generateAudio: false },
})

/**
 * After the first payment, move the customer from the trial writing model to Opus 5.5 —
 * but only where they still use the trial default, so a model they picked themselves stays.
 * Never throws: a failure here must not affect the payment.
 */
export async function upgradeTrialDefaultsAfterPayment(userId: string): Promise<void> {
  if (!isCentralEvolinkEnabled()) return
  try {
    await prisma.userPreference.updateMany({
      where: { userId, analysisModel: TRIAL_ANALYSIS_MODEL },
      data: { analysisModel: PAID_ANALYSIS_MODEL },
    })
    await prisma.studioProject.updateMany({
      where: { analysisModel: TRIAL_ANALYSIS_MODEL, project: { userId } },
      data: { analysisModel: PAID_ANALYSIS_MODEL },
    })
  } catch {
    // The customer can still choose Opus in settings.
  }
}

/**
 * Fills any empty model preference with the platform default. Never overwrites a choice
 * the user made. No-op unless the central EvoLink account is enabled. Never throws.
 */
export async function ensurePlatformDefaultModels(userId: string): Promise<void> {
  if (!isCentralEvolinkEnabled()) return
  try {
    const existing = await prisma.userPreference.findUnique({ where: { userId } })
    if (!existing) {
      await prisma.userPreference.create({
        data: { userId, ...PLATFORM_DEFAULT_MODELS, capabilityDefaults: JSON.stringify(PLATFORM_DEFAULT_CAPABILITIES) },
      })
      return
    }

    const missing: Record<string, string> = {}
    for (const [field, modelKey] of Object.entries(PLATFORM_DEFAULT_MODELS)) {
      if (!existing[field as keyof typeof PLATFORM_DEFAULT_MODELS]) missing[field] = modelKey
    }
    if (!existing.capabilityDefaults || existing.capabilityDefaults === PREVIOUS_DEFAULT_CAPABILITIES) {
      missing.capabilityDefaults = JSON.stringify(PLATFORM_DEFAULT_CAPABILITIES)
    }
    if (Object.keys(missing).length > 0) {
      await prisma.userPreference.update({ where: { userId }, data: missing })
    }
  } catch {
    // A concurrent create (unique userId) or transient error: the user can still pick models manually.
  }
}

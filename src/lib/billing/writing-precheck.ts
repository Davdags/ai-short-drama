import { prisma } from '@/lib/prisma'
import { getBalance } from './ledger'
import { getBillingMode } from './mode'
import { InsufficientBalanceError } from './errors'
import { resolveStoryLengthPlan, totalShots } from '@/lib/studio/story-length'
import { estimateScriptWritingCredits, estimateStoryboardWritingCredits } from '@/lib/studio/writing-cost'

/** Without a length plan the storyboard size is unknown; a short drama is typically this many shots. */
const DEFAULT_ESTIMATE_SHOTS = 4

/**
 * Text is billed on tokens used, so its up-front hold is small and a long job could run past
 * the balance without the customer ever seeing the upgrade prompt. Refuse up front instead,
 * with the same 402 refusal every other paid action uses (the app opens the upgrade prompt).
 */
export async function assertCanAffordWriting(input: {
  userId: string
  projectId: string
  stage: 'script' | 'storyboard'
  storyChars?: number
}): Promise<void> {
  if (await getBillingMode() !== 'ENFORCE') return

  const [studio, preference, balance] = await Promise.all([
    prisma.studioProject.findUnique({
      where: { projectId: input.projectId },
      select: { analysisModel: true, targetDurationSec: true, shotLengthSec: true },
    }),
    prisma.userPreference.findUnique({ where: { userId: input.userId }, select: { analysisModel: true } }),
    getBalance(input.userId),
  ])
  const model = studio?.analysisModel || preference?.analysisModel || null

  let required: number
  if (input.stage === 'script') {
    required = estimateScriptWritingCredits(model, input.storyChars ?? 0)
  } else {
    const plan = studio ? resolveStoryLengthPlan(studio) : null
    required = estimateStoryboardWritingCredits(model, plan ? totalShots(plan) : DEFAULT_ESTIMATE_SHOTS)
  }

  if (balance.balance < required) {
    throw new InsufficientBalanceError(required, balance.balance)
  }
}

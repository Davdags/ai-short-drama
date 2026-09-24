import { NextRequest, NextResponse } from 'next/server'
import { apiHandler, ApiError } from '@/lib/api-errors'
import { isErrorResponse, requireUserAuth } from '@/lib/api-auth'
import { calcImage, calcLipSync, calcVideo, calcVoice } from '@/lib/billing/cost'
import { getBalance } from '@/lib/billing/ledger'
import { getBillingMode } from '@/lib/billing/mode'
import { getProjectModelConfig, resolveProjectModelCapabilityGenerationOptions } from '@/lib/config-service'

/**
 * POST /api/user/price-quote
 *   { items: [{ apiType, model, quantity?, metadata? }] }
 *
 * What a generation will cost in NucleusArt credits, using the same pricing as billing,
 * so the app can show the price on the button before the customer clicks it.
 */
interface QuoteItem {
  apiType?: unknown
  model?: unknown
  quantity?: unknown
  metadata?: Record<string, unknown>
  /** Ask the server to fill in the model the project is configured to use, e.g. storyboard images. */
  usesProjectModel?: unknown
  projectId?: unknown
  /** Which project model to use with usesProjectModel (default: storyboard images). */
  projectModelField?: unknown
}

type ProjectImageModelField = 'characterModel' | 'locationModel' | 'storyboardModel'

function projectModelFieldOf(item: QuoteItem): ProjectImageModelField {
  return item.projectModelField === 'characterModel' || item.projectModelField === 'locationModel'
    ? item.projectModelField
    : 'storyboardModel'
}

/**
 * Some buttons (batch storyboard images) do not know the model: the server resolves it from the
 * project config at submit time. Fill the same model in here so the price matches what is charged.
 */
async function fillProjectModels(items: QuoteItem[], userId: string): Promise<void> {
  const keys = new Set(
    items
      .filter((item) => item.usesProjectModel === true && typeof item.projectId === 'string' && item.projectId)
      .map((item) => `${item.projectId as string}|${projectModelFieldOf(item)}`),
  )
  if (keys.size === 0) return

  const configs = new Map<string, { model: string; options: Record<string, unknown> }>()
  await Promise.all([...keys].map(async (key) => {
    const [projectId, field] = key.split('|') as [string, ProjectImageModelField]
    try {
      const config = await getProjectModelConfig(projectId, userId)
      const model = config[field]
      if (!model) return
      const options = await resolveProjectModelCapabilityGenerationOptions({
        projectId,
        userId,
        modelType: 'image',
        modelKey: model,
      })
      configs.set(key, { model, options })
    } catch {
      // No access or no configured model: that item simply gets no price.
    }
  }))

  for (const item of items) {
    if (item.usesProjectModel !== true) continue
    const config = typeof item.projectId === 'string' ? configs.get(`${item.projectId}|${projectModelFieldOf(item)}`) : undefined
    if (!config) continue
    item.model = config.model
    item.metadata = { ...config.options, ...(item.metadata ?? {}) }
  }
}

function quoteOne(item: QuoteItem): number | null {
  const model = typeof item.model === 'string' ? item.model : ''
  const quantity = Math.max(1, Math.floor(Number(item.quantity) || 1))
  const metadata = (item.metadata && typeof item.metadata === 'object' ? item.metadata : {}) as Record<string, unknown>
  if (!model) return null
  try {
    switch (item.apiType) {
      case 'image':
        return calcImage(model, quantity, metadata)
      case 'video': {
        const resolution = typeof metadata.resolution === 'string' ? metadata.resolution : '720p'
        return calcVideo(model, resolution, quantity, metadata)
      }
      case 'voice':
        return calcVoice(Math.max(1, Math.floor(Number(metadata.seconds) || quantity)))
      case 'lip-sync':
        return calcLipSync(model) * quantity
      default:
        return null
    }
  } catch {
    // Unpriced or unsupported combination: the UI simply shows no price.
    return null
  }
}

export const POST = apiHandler(async (request: NextRequest) => {
  const authResult = await requireUserAuth()
  if (isErrorResponse(authResult)) return authResult

  const body = await request.json().catch(() => null) as { items?: unknown } | null
  const items = Array.isArray(body?.items) ? body.items.slice(0, 50) as QuoteItem[] : null
  if (!items || items.length === 0) throw new ApiError('INVALID_PARAMS', { field: 'items', reason: 'required' })

  await fillProjectModels(items, authResult.session.user.id)
  const quotes = items.map(quoteOne)
  const priced = quotes.filter((value): value is number => typeof value === 'number')
  const total = priced.reduce((sum, value) => sum + value, 0)
  const [balance, mode] = await Promise.all([getBalance(authResult.session.user.id), getBillingMode()])

  return NextResponse.json({
    success: true,
    quotes,
    totalCredits: Math.ceil(total),
    balance: balance.balance,
    // With billing off, nothing is charged, so the UI hides prices.
    charging: mode === 'ENFORCE',
    affordable: mode !== 'ENFORCE' || balance.balance >= total,
  })
})

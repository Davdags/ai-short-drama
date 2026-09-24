import { afterEach, describe, expect, it, vi } from 'vitest'
import { resolveBuiltinPricing } from '@/lib/model-pricing/lookup'

/**
 * gemini-3-flash-preview is priced under both google and evolink. Text billing passes the
 * bare model id, so every Gemini Flash story failed with "Ambiguous text pricing modelId"
 * after EvoLink had already done (and charged for) the work.
 */
describe('pricing lookup for model ids shared by several providers', () => {
  afterEach(() => { vi.unstubAllEnvs() })

  it('uses the EvoLink price when the central EvoLink account is on', () => {
    vi.stubEnv('EVOLINK_API_KEYS', 'k1')
    const result = resolveBuiltinPricing({ apiType: 'text', model: 'gemini-3-flash-preview', selections: { tokenType: 'input' } })
    expect(result.status).toBe('resolved')
    if (result.status === 'resolved') expect(result.entry.provider).toBe('evolink')
  })

  it('stays ambiguous without the central account', () => {
    vi.stubEnv('EVOLINK_API_KEYS', '')
    vi.stubEnv('EVOLINK_API_KEY', '')
    const result = resolveBuiltinPricing({ apiType: 'text', model: 'gemini-3-flash-preview', selections: { tokenType: 'input' } })
    expect(result.status).toBe('ambiguous_model')
  })
})

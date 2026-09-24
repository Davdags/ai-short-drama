import type { CapabilitySelections } from '@/lib/model-config-contract'

function parseSelections(raw: unknown): CapabilitySelections {
  if (!raw) return {}
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw as CapabilitySelections
  if (typeof raw !== 'string') return {}
  try {
    const parsed = JSON.parse(raw) as unknown
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as CapabilitySelections : {}
  } catch {
    return {}
  }
}

/**
 * Account-level capability defaults with project-level choices on top, per model.
 * Returns a JSON string (the stored format) or null when both are empty.
 */
export function mergeCapabilitySelectionJson(accountDefaults: unknown, projectOverrides: unknown): string | null {
  const defaults = parseSelections(accountDefaults)
  const overrides = parseSelections(projectOverrides)
  const merged: CapabilitySelections = {}
  for (const modelKey of new Set([...Object.keys(defaults), ...Object.keys(overrides)])) {
    merged[modelKey] = { ...(defaults[modelKey] || {}), ...(overrides[modelKey] || {}) }
  }
  return Object.keys(merged).length > 0 ? JSON.stringify(merged) : null
}

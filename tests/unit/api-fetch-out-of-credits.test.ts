import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OUT_OF_CREDITS_EVENT, apiFetch, getPageLocale } from '@/lib/api-fetch'

/**
 * A real customer ran out of credits and clicked "generate" ten times: every request was
 * refused with 402, but most buttons ignore failures, so nothing appeared. apiFetch now
 * announces the refusal so a single upgrade prompt can explain it.
 */
function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

const refusal = {
  success: false,
  error: { code: 'INSUFFICIENT_BALANCE', message: 'Needs 25 credits, you have 6.', details: { required: 25, available: 6.67 } },
}

describe('apiFetch out-of-credits announcement', () => {
  let events: CustomEvent[]
  const target = new EventTarget()

  beforeEach(() => {
    events = []
    vi.stubGlobal('window', Object.assign(target, { location: { pathname: '/en/workspace' } }))
    target.addEventListener(OUT_OF_CREDITS_EVENT, (event) => events.push(event as CustomEvent))
  })
  afterEach(() => { vi.unstubAllGlobals() })

  const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

  it('announces a 402 insufficient-balance refusal with the amounts', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(402, refusal)))
    const res = await apiFetch('/api/asset-hub/generate-image', { method: 'POST' })
    await flush()
    expect(res.status).toBe(402)
    expect(events).toHaveLength(1)
    expect(events[0].detail).toEqual({ required: 25, available: 6.67 })
  })

  it('leaves the response readable for the caller', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(402, refusal)))
    const res = await apiFetch('/api/asset-hub/generate-image', { method: 'POST' })
    const body = await res.json() as typeof refusal
    expect(body.error.code).toBe('INSUFFICIENT_BALANCE')
  })

  it('stays silent for other failures and for success', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(400, { error: { code: 'INVALID_PARAMS' } })))
    await apiFetch('/api/x', { method: 'POST' })
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(200, { success: true })))
    await apiFetch('/api/x', { method: 'POST' })
    await flush()
    expect(events).toHaveLength(0)
  })

  it('falls back to English, not Chinese, when the path has no locale', () => {
    ;(globalThis.window as unknown as { location: { pathname: string } }).location.pathname = '/workspace'
    expect(getPageLocale()).toBe('en')
  })
})

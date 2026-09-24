import { beforeEach, describe, expect, it, vi } from 'vitest'

const getProviderConfigMock = vi.hoisted(() => vi.fn())
const resolveToExternalUrlMock = vi.hoisted(() => vi.fn(async (input: string) => input))

vi.mock('@/lib/api-config', () => ({
  getProviderConfig: getProviderConfigMock,
}))

vi.mock('@/lib/providers/evolink/url-resolver', () => ({
  resolveToExternalUrl: resolveToExternalUrlMock,
}))

import { submitEvolinkLipSync } from '@/lib/lipsync/providers/evolink'
import { EVOLINK_API_BASE } from '@/lib/providers/evolink/constants'

const SUBMIT_ENDPOINT = `${EVOLINK_API_BASE}/videos/generations`

function buildJsonResponse(payload: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
    text: async () => JSON.stringify(payload),
  } as unknown as Response
}

const context = {
  userId: 'user-1',
  providerId: 'evolink',
  modelId: 'videoretalk',
  modelKey: 'evolink::videoretalk',
}

describe('lip-sync evolink submit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getProviderConfigMock.mockResolvedValue({ id: 'evolink', apiKey: 'ev-key' })
  })

  it('submits videoretalk to the unified video generations endpoint with top-level urls', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input) === SUBMIT_ENDPOINT) return buildJsonResponse({ id: 'task-unified-1' })
      throw new Error(`unexpected fetch: ${String(input)}`)
    })
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)

    const result = await submitEvolinkLipSync(
      {
        videoUrl: 'https://files.example.com/shot.mp4',
        audioUrl: 'https://files.example.com/line.wav',
      },
      context as never,
    )

    const [, init] = fetchMock.mock.calls[0] as unknown as [RequestInfo | URL, RequestInit]
    expect(init.method).toBe('POST')
    expect(init.headers).toEqual({
      Authorization: 'Bearer ev-key',
      'Content-Type': 'application/json',
    })
    expect(JSON.parse(String(init.body))).toEqual({
      model: 'videoretalk',
      video_url: 'https://files.example.com/shot.mp4',
      audio_url: 'https://files.example.com/line.wav',
    })
    expect(result).toEqual({
      requestId: 'task-unified-1',
      externalId: 'EVOLINK:VIDEO:task-unified-1',
      async: true,
    })
  })

  it('throws explicit error when evolink task id is missing', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => buildJsonResponse({})) as unknown as typeof fetch)

    await expect(submitEvolinkLipSync(
      {
        videoUrl: 'https://files.example.com/shot.mp4',
        audioUrl: 'https://files.example.com/line.wav',
      },
      context as never,
    )).rejects.toThrow('EVOLINK_LIPSYNC_TASK_ID_MISSING')
  })
})

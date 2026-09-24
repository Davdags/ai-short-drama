import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({ active: 0, maxActive: 0, failuresLeft: 0, seq: 0, options: [] as unknown[] }))

const prismaMock = vi.hoisted(() => ({
  $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>, options?: unknown) => {
    state.options.push(options)
    state.active += 1
    state.maxActive = Math.max(state.maxActive, state.active)
    try {
      await new Promise((resolve) => setTimeout(resolve, 5))
      if (state.failuresLeft > 0) {
        state.failuresLeft -= 1
        throw Object.assign(new Error('Transaction already closed'), { code: 'P2028' })
      }
      const tx = {
        graphRun: { update: vi.fn(async () => ({ id: 'run-1', lastSeq: ++state.seq })), updateMany: vi.fn(async () => ({ count: 1 })) },
        graphEvent: {
          create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: `e${data.seq}`, ...data, createdAt: new Date() })),
        },
        graphStep: { updateMany: vi.fn(async () => ({ count: 0 })), upsert: vi.fn(async () => ({})) },
        graphStepAttempt: { upsert: vi.fn(async () => ({})) },
      }
      return await fn(tx)
    } finally {
      state.active -= 1
    }
  }),
}))
vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))

import { appendRunEventWithSeq } from '@/lib/run-runtime/service'

const event = (stepKey: string) => ({
  runId: 'run-1',
  projectId: 'p1',
  userId: 'u1',
  eventType: 'step.chunk',
  stepKey,
  payload: { text: 'x' },
}) as Parameters<typeof appendRunEventWithSeq>[0]

describe('appendRunEventWithSeq', () => {
  beforeEach(() => {
    Object.assign(state, { active: 0, maxActive: 0, failuresLeft: 0, seq: 0, options: [] })
    vi.clearAllMocks()
  })

  it('writes events of the same run one at a time, in order, with a longer timeout', async () => {
    const results = await Promise.all(['a', 'b', 'c', 'd'].map((key) => appendRunEventWithSeq(event(key))))
    expect(state.maxActive).toBe(1)
    expect(results.map((row) => row.seq)).toEqual([1, 2, 3, 4])
    expect(state.options[0]).toEqual({ maxWait: 10_000, timeout: 15_000 })
  })

  it('retries a transaction timeout instead of failing the step', async () => {
    state.failuresLeft = 2
    const row = await appendRunEventWithSeq(event('a'))
    expect(row.seq).toBe(1)
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(3)
  })

  it('gives up after three attempts and does not block later events', async () => {
    state.failuresLeft = 3
    await expect(appendRunEventWithSeq(event('a'))).rejects.toMatchObject({ code: 'P2028' })
    await expect(appendRunEventWithSeq(event('b'))).resolves.toMatchObject({ seq: 1 })
  })
})

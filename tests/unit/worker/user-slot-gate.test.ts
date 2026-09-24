import { DelayedError, type Job } from 'bullmq'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const redisMock = vi.hoisted(() => ({ eval: vi.fn(), zrem: vi.fn(async () => 1) }))
vi.mock('@/lib/redis', () => ({ queueRedis: redisMock }))

import { runWithUserSlot } from '@/lib/workers/user-slot-gate'

function fakeJob(): Job {
  return { id: 'job-7', moveToDelayed: vi.fn(async () => undefined) } as unknown as Job
}

describe('user slot gate', () => {
  beforeEach(() => vi.clearAllMocks())

  it('runs the job inside a slot and always releases it', async () => {
    redisMock.eval.mockResolvedValue(1)
    const job = fakeJob()
    await expect(runWithUserSlot({ job, token: 't', scope: 'video', userId: 'u1', limit: 1, run: async () => 'done' })).resolves.toBe('done')
    expect(redisMock.eval.mock.calls[0]).toEqual(expect.arrayContaining(['nucleusart:user-slots:video:u1', 'job-7', '1']))
    expect(redisMock.zrem).toHaveBeenCalledWith('nucleusart:user-slots:video:u1', 'job-7')

    redisMock.eval.mockResolvedValue(1)
    await expect(runWithUserSlot({ job, token: 't', scope: 'video', userId: 'u1', limit: 1, run: async () => { throw new Error('boom') } })).rejects.toThrow('boom')
    expect(redisMock.zrem).toHaveBeenCalledTimes(2)
  })

  it('puts the job back in the queue instead of holding a worker when the user is at their limit', async () => {
    redisMock.eval.mockResolvedValue(0)
    const job = fakeJob()
    const run = vi.fn()
    const before = Date.now()
    await expect(runWithUserSlot({ job, token: 'lock', scope: 'image', userId: 'u1', limit: 2, run })).rejects.toBeInstanceOf(DelayedError)
    expect(run).not.toHaveBeenCalled()
    expect(redisMock.zrem).not.toHaveBeenCalled()
    const [delayUntil, token] = (job.moveToDelayed as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(token).toBe('lock')
    expect(delayUntil).toBeGreaterThanOrEqual(before + 4_000)
    expect(delayUntil).toBeLessThanOrEqual(Date.now() + 6_000)
  })
})

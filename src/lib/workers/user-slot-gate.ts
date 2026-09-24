import { DelayedError, type Job } from 'bullmq'
import { queueRedis } from '@/lib/redis'

/**
 * Fair per-user limits across all worker processes.
 *
 * A user's running jobs are tracked in a Redis sorted set. When a user is at their limit,
 * the job is put back in the queue for a few seconds instead of holding a worker slot, so
 * one user submitting 40 panels can never block everyone else. The task keeps its
 * "queued" status while it waits.
 */

/** Slots older than this are treated as leaked (crashed worker) and freed. */
const SLOT_STALE_MS = 45 * 60 * 1000
const RETRY_DELAY_MS = 4_000
const RETRY_JITTER_MS = 2_000

const ACQUIRE_SCRIPT = `
redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', ARGV[1] - ARGV[4])
if redis.call('ZSCORE', KEYS[1], ARGV[2]) then return 1 end
if redis.call('ZCARD', KEYS[1]) < tonumber(ARGV[3]) then
  redis.call('ZADD', KEYS[1], ARGV[1], ARGV[2])
  redis.call('PEXPIRE', KEYS[1], ARGV[4])
  return 1
end
return 0
`

function slotKey(scope: string, userId: string): string {
  return `nucleusart:user-slots:${scope}:${userId}`
}

export async function tryAcquireUserSlot(input: { scope: string; userId: string; jobId: string; limit: number; now?: number }): Promise<boolean> {
  const result = await queueRedis.eval(
    ACQUIRE_SCRIPT,
    1,
    slotKey(input.scope, input.userId),
    String(input.now ?? Date.now()),
    input.jobId,
    String(Math.max(1, input.limit)),
    String(SLOT_STALE_MS),
  )
  return Number(result) === 1
}

export async function releaseUserSlot(input: { scope: string; userId: string; jobId: string }): Promise<void> {
  await queueRedis.zrem(slotKey(input.scope, input.userId), input.jobId)
}

/**
 * Runs the job inside the user's slot, or sends it back to the queue for a short wait when
 * the user is at their limit (throws BullMQ's DelayedError, which is not a failure).
 */
export async function runWithUserSlot<T>(input: {
  job: Job
  token: string | undefined
  scope: string
  userId: string
  limit: number
  run: () => Promise<T>
}): Promise<T> {
  const jobId = String(input.job.id)
  const acquired = await tryAcquireUserSlot({ scope: input.scope, userId: input.userId, jobId, limit: input.limit })
  if (!acquired) {
    await input.job.moveToDelayed(Date.now() + RETRY_DELAY_MS + Math.floor(Math.random() * RETRY_JITTER_MS), input.token)
    throw new DelayedError()
  }
  try {
    return await input.run()
  } finally {
    await releaseUserSlot({ scope: input.scope, userId: input.userId, jobId }).catch(() => undefined)
  }
}

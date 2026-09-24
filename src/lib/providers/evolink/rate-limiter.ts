import { randomUUID } from 'crypto'
import { queueRedis } from '@/lib/redis'

/**
 * Keeps NucleusArt under EvoLink's per-model request rate across all processes.
 *
 * EvoLink limits are per account and per model (50 requests/minute; Seedance 2.5: 30), shared
 * by every key. We stay below them with a sliding one-minute window in Redis; a request over
 * the limit waits a few seconds instead of risking a rejection. If Redis is unavailable the
 * request goes ahead (EvoLink queues or 429s, which the task retry handles).
 */

const WINDOW_MS = 60_000
const DEFAULT_RPM = 45
const MAX_WAIT_MS = 90_000
/** A slow or unreachable Redis must never stall generation. */
const REDIS_TIMEOUT_MS = 2_000

const SLIDING_WINDOW_SCRIPT = `
redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', ARGV[1] - ARGV[2])
if redis.call('ZCARD', KEYS[1]) < tonumber(ARGV[3]) then
  redis.call('ZADD', KEYS[1], ARGV[1], ARGV[4])
  redis.call('PEXPIRE', KEYS[1], ARGV[2])
  return 0
end
local oldest = redis.call('ZRANGE', KEYS[1], 0, 0, 'WITHSCORES')
return (tonumber(oldest[2]) + tonumber(ARGV[2])) - tonumber(ARGV[1])
`

const VARIANT_SUFFIX = /(-fast)?(-(text|image|reference)-to-video|-video-edit|-video-extend)?(-flash)?(-beta)?$/

/** Groups variants under their model, e.g. seedance-2.0-fast-image-to-video → seedance-2.0. */
export function evolinkRateLimitModel(modelId: string): string {
  const id = modelId.trim().toLowerCase()
  const seedance = id.match(/^seedance-\d+(\.\d+)?/)
  if (seedance) return seedance[0]
  return id.replace(VARIANT_SUFFIX, '') || id
}

export function evolinkRequestsPerMinute(modelId: string): number {
  if (evolinkRateLimitModel(modelId) === 'seedance-2.5') return 25
  return Number(process.env.EVOLINK_RPM_PER_MODEL) || DEFAULT_RPM
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('EVOLINK_RATE_LIMITER_TIMEOUT')), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

/** Returns 0 when a request may go now, otherwise how many ms to wait. */
export async function reserveEvolinkRequest(modelId: string, now = Date.now()): Promise<number> {
  const result = await withTimeout(queueRedis.eval(
    SLIDING_WINDOW_SCRIPT,
    1,
    `nucleusart:evolink-rpm:${evolinkRateLimitModel(modelId)}`,
    String(now),
    String(WINDOW_MS),
    String(evolinkRequestsPerMinute(modelId)),
    `${now}:${randomUUID()}`,
  ) as Promise<unknown>, REDIS_TIMEOUT_MS)
  return Math.max(0, Number(result) || 0)
}

/** Waits (up to 90s) until a request for this model fits within the per-minute limit. */
export async function waitForEvolinkRequestSlot(modelId: string): Promise<void> {
  const startedAt = Date.now()
  for (;;) {
    let waitMs: number
    try {
      waitMs = await reserveEvolinkRequest(modelId)
    } catch {
      return
    }
    if (waitMs === 0) return
    if (Date.now() - startedAt + waitMs > MAX_WAIT_MS) return
    await new Promise((resolve) => setTimeout(resolve, waitMs + Math.floor(Math.random() * 500)))
  }
}

/**
 * Compares what EvoLink actually charged per task with the NucleusArt credits we billed.
 *
 *   npx tsx --env-file=.env scripts/billing-reconcile-evolink.ts [--days=7]
 *
 * Expected ratio (charged / EvoLink credits) is CREDITS_PER_EVOLINK_CREDIT (5). A ratio
 * below that means a catalog price is too low for how the model is really being used.
 */
import { prisma } from '@/lib/prisma'
import { getProviderConfig } from '@/lib/api-config'
import { CREDITS_PER_EVOLINK_CREDIT } from '@/lib/billing/cost'

type Row = { type: string; model: string; tasks: number; evolinkCredits: number; charged: number; unpriced: number }

function readDays(): number {
  const arg = process.argv.find((value) => value.startsWith('--days='))
  const days = arg ? Number(arg.slice('--days='.length)) : 7
  return Number.isFinite(days) && days > 0 ? days : 7
}

async function fetchEvolinkCost(apiKey: string, taskId: string): Promise<{ model: string; credits: number } | null> {
  const response = await fetch(`https://api.evolink.ai/v1/tasks/${encodeURIComponent(taskId)}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  if (!response.ok) return null
  const data = await response.json() as { model?: string; usage?: { cost?: { credits?: number }; credits_used?: number } }
  const credits = data.usage?.cost?.credits ?? data.usage?.credits_used
  return typeof credits === 'number' ? { model: data.model || 'unknown', credits } : null
}

async function main() {
  const since = new Date(Date.now() - readDays() * 24 * 60 * 60 * 1000)
  const tasks = await prisma.task.findMany({
    where: { status: 'completed', externalId: { startsWith: 'EVOLINK:' }, createdAt: { gte: since } },
    select: { userId: true, type: true, externalId: true, billingInfo: true },
  })

  const keys = new Map<string, string>()
  const rows = new Map<string, Row>()
  for (const task of tasks) {
    if (!keys.has(task.userId)) {
      const { apiKey } = await getProviderConfig(task.userId, 'evolink')
      keys.set(task.userId, apiKey || '')
    }
    const apiKey = keys.get(task.userId)
    const taskId = task.externalId?.split(':').pop()
    if (!apiKey || !taskId) continue

    const cost = await fetchEvolinkCost(apiKey, taskId)
    if (!cost) continue
    const billing = (task.billingInfo || {}) as { chargedCost?: number; status?: string }
    const charged = billing.status === 'settled' && typeof billing.chargedCost === 'number' ? billing.chargedCost : 0

    const key = `${task.type}|${cost.model}`
    const row = rows.get(key) || { type: task.type, model: cost.model, tasks: 0, evolinkCredits: 0, charged: 0, unpriced: 0 }
    row.tasks += 1
    row.evolinkCredits += cost.credits
    row.charged += charged
    if (charged === 0) row.unpriced += 1
    rows.set(key, row)
  }

  const report = [...rows.values()].map((row) => ({
    ...row,
    evolinkCredits: Number(row.evolinkCredits.toFixed(4)),
    charged: Number(row.charged.toFixed(4)),
    ratio: row.evolinkCredits > 0 ? Number((row.charged / row.evolinkCredits).toFixed(2)) : null,
    targetRatio: CREDITS_PER_EVOLINK_CREDIT,
  }))
  process.stdout.write(`${JSON.stringify({ since: since.toISOString(), tasks: tasks.length, report }, null, 2)}\n`)
}

main()
  .catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())

'use client'

import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api-fetch'
import type { RevenueMetrics } from '@/lib/admin/revenue'

const CARD = 'rounded-2xl border border-[#ececec] bg-white p-6 shadow-sm'
const usd = (value: number) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const n = (value: number) => value.toLocaleString('en-US')
/** Short amount for chart labels so six bars fit on a phone ("$1.2k"). */
const usdShort = (value: number) => (value >= 1000 ? `$${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k` : `$${Math.round(value)}`)
const monthName = (yyyyMm: string) => new Date(`${yyyyMm}-01T00:00:00Z`).toLocaleString('en-US', { month: 'short', timeZone: 'UTC' })
const PLAN_NAMES: Record<string, string> = { starter: 'Starter', pro: 'Pro', studio: 'Studio' }
const PROVIDER_NAMES: Record<string, string> = { whop: 'Whop (card)', paystack: 'Paystack', flutterwave: 'Flutterwave' }

function Stat({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: 'good' | 'bad' }) {
  const color = tone === 'good' ? 'text-emerald-600' : tone === 'bad' ? 'text-red-500' : 'text-[#171717]'
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-[#737373]">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-[#737373]">{hint}</p>}
    </div>
  )
}

/** Money section of the admin dashboard: recurring revenue, sales, subscribers and costs (USD). */
export function AdminRevenue() {
  const [data, setData] = useState<RevenueMetrics | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    apiFetch('/api/admin/revenue')
      .then(async (res) => {
        if (!res.ok) return setFailed(true)
        setData(await res.json() as RevenueMetrics)
      })
      .catch(() => setFailed(true))
  }, [])

  if (failed) return <div className={CARD}><p className="text-sm text-red-500">Could not load revenue numbers. Please refresh.</p></div>
  if (!data) return <div className="h-40 animate-pulse rounded-2xl bg-white" />

  const { recurring, revenue, customers, costs } = data
  const peak = Math.max(1, ...revenue.byMonth.map((m) => m.total))
  const netMrrChange = customers.newMrr - customers.churnedMrr

  return (
    <>
      <div className={`${CARD} grid gap-6 sm:grid-cols-2 lg:grid-cols-4`}>
        <Stat label="MRR" value={usd(recurring.mrr)} hint={`${n(recurring.subscribers)} paying subscribers · ARPU ${usd(recurring.arpu)}`} />
        <Stat label="ARR" value={usd(recurring.arr)} hint="MRR × 12" />
        <Stat label="Revenue this month" value={usd(revenue.monthToDate.total)} hint={`${usd(revenue.monthToDate.subscriptions)} plans · ${usd(revenue.monthToDate.topUps)} top-ups`} />
        <Stat label="Revenue (all time)" value={usd(revenue.allTime.total)} hint={`${n(revenue.allTime.count)} payments · ${n(customers.payingAllTime)} paying customers`} />
      </div>

      <div className={`${CARD} grid gap-6 sm:grid-cols-2 lg:grid-cols-4`}>
        <Stat label="Revenue (24h)" value={usd(revenue.last24h.total)} hint={`${n(revenue.last24h.count)} payments`} />
        <Stat label="Revenue (7 days)" value={usd(revenue.last7d.total)} hint={`${n(revenue.last7d.count)} payments`} />
        <Stat label="Revenue (30 days)" value={usd(revenue.last30d.total)} hint={`${usd(revenue.last30d.subscriptions)} plans · ${usd(revenue.last30d.topUps)} top-ups`} />
        <Stat
          label="Gross profit (30 days)"
          value={usd(costs.grossProfit30d)}
          hint={`after ${usd(costs.evolinkCost30d)} EvoLink cost`}
          tone={costs.grossProfit30d >= 0 ? 'good' : 'bad'}
        />
      </div>

      <div className={`${CARD} grid gap-6 sm:grid-cols-2 lg:grid-cols-4`}>
        <Stat label="New subscribers (30 days)" value={n(customers.newSubscribers)} hint={`+${usd(customers.newMrr)} MRR`} tone={customers.newSubscribers ? 'good' : undefined} />
        <Stat label="Churned (30 days)" value={n(customers.churnedSubscribers)} hint={`−${usd(customers.churnedMrr)} MRR`} tone={customers.churnedSubscribers ? 'bad' : undefined} />
        <Stat label="Net MRR change (30 days)" value={`${netMrrChange >= 0 ? '+' : '−'}${usd(Math.abs(netMrrChange))}`} tone={netMrrChange > 0 ? 'good' : netMrrChange < 0 ? 'bad' : undefined} />
        <Stat label="Affiliate commissions" value={usd(costs.affiliateOwed)} hint={`owed · ${usd(costs.affiliatePaid)} paid out`} />
      </div>

      <div className={`${CARD} grid gap-8 lg:grid-cols-3`}>
        <div className="lg:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#737373]">Revenue by month</p>
          <div className="mt-4 flex h-40 items-end gap-2 sm:gap-3">
            {revenue.byMonth.map((m) => (
              <div key={m.month} className="flex min-w-0 flex-1 flex-col items-center gap-1" title={`${m.month}: ${usd(m.total)}`}>
                <span className="text-[11px] font-semibold text-[#404040]">{m.total ? usdShort(m.total) : '—'}</span>
                <div className="w-full rounded-t-md bg-[#8020fc]" style={{ height: `${Math.max(2, (m.total / peak) * 110)}px` }} />
                <span className="text-[11px] text-[#737373]">{monthName(m.month)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#737373]">Subscribers by plan</p>
            <ul className="mt-2 space-y-1 text-sm text-[#404040]">
              {Object.entries(recurring.byPlan).map(([plan, row]) => (
                <li key={plan} className="flex justify-between"><span>{PLAN_NAMES[plan] ?? plan}</span><span>{n(row.count)} · {usd(row.mrr)}/mo</span></li>
              ))}
              <li className="flex justify-between text-xs text-[#737373]"><span>Monthly / yearly</span><span>{n(recurring.monthly)} / {n(recurring.yearly)}</span></li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#737373]">Revenue by payment method</p>
            <ul className="mt-2 space-y-1 text-sm text-[#404040]">
              {Object.keys(revenue.byProvider).length === 0 && <li className="text-[#737373]">No payments yet</li>}
              {Object.entries(revenue.byProvider).map(([provider, total]) => (
                <li key={provider} className="flex justify-between"><span>{PROVIDER_NAMES[provider] ?? provider}</span><span>{usd(total)}</span></li>
              ))}
              <li className="flex justify-between text-xs text-[#737373]"><span>Failed / abandoned (30 days)</span><span>{n(customers.failedOrAbandonedPayments30d)}</span></li>
            </ul>
          </div>
        </div>
      </div>
    </>
  )
}

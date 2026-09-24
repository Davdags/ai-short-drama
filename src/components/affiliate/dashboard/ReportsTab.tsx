'use client'

import { useState } from 'react'
import { CARD, formatUsd, type AffiliateDashboard } from './shared'

type Metric = 'clicks' | 'referrals' | 'earningsUsd'
const METRICS: Array<{ id: Metric; label: string }> = [
  { id: 'clicks', label: 'Clicks' },
  { id: 'referrals', label: 'Referrals' },
  { id: 'earningsUsd', label: 'Earnings' },
]

export function ReportsTab({ dashboard }: { dashboard: AffiliateDashboard }) {
  const [metric, setMetric] = useState<Metric>('clicks')
  const values = dashboard.report.map((day) => day[metric])
  const max = Math.max(...values, 0)
  const total = values.reduce((sum, value) => sum + value, 0)
  const format = (value: number) => (metric === 'earningsUsd' ? formatUsd(value) : String(value))

  return (
    <div className={CARD}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-[#171717]">Reports</h2>
        <span className="text-sm text-[#737373]">Timeframe: <span className="font-medium text-[#404040]">Last 30 days</span></span>
      </div>

      <div className="mt-5 flex gap-6 border-b border-[#ececec]">
        {METRICS.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMetric(m.id)}
            className={`-mb-px border-b-2 pb-2 text-sm font-medium transition ${metric === m.id ? 'border-[#8020fc] text-[#8020fc]' : 'border-transparent text-[#737373] hover:text-[#171717]'}`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <p className="mt-5 text-sm text-[#737373]">
        Total: <span className="font-semibold text-[#171717]">{format(total)}</span>
      </p>
      {max === 0 ? (
        <div className="flex h-56 items-center justify-center text-sm text-[#a3a3a3]">No chart data</div>
      ) : (
        <div className="mt-4 flex h-56 items-end gap-1">
          {dashboard.report.map((day) => (
            <div key={day.day} className="group relative flex h-full flex-1 items-end">
              <div
                className="w-full rounded-t bg-gradient-to-t from-[#8020fc] to-[#a78bfa] transition group-hover:brightness-110"
                style={{ height: `${Math.max(2, (day[metric] / max) * 100)}%`, opacity: day[metric] === 0 ? 0.15 : 1 }}
              />
              <div className="pointer-events-none absolute bottom-full left-1/2 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded bg-[#171717] px-2 py-1 text-xs text-white group-hover:block">
                {day.day}: {format(day[metric])}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

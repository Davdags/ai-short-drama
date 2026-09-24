'use client'

import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api-fetch'

interface Transaction {
  id: string
  type: string
  amount: number
  balanceAfter: number
  action: string | null
  projectName: string | null
  episodeNumber: number | null
  description: string | null
  createdAt: string
}

interface Page {
  transactions: Transaction[]
  pagination: { page: number; totalPages: number; total: number }
}

/** Friendly names for what a charge was for (task types from the pipeline). */
const ACTIVITY_LABELS: Record<string, string> = {
  story_to_script_run: 'Script writing',
  script_to_storyboard_run: 'Storyboard planning',
  analyze_novel: 'Story analysis',
  analyze_global: 'Asset analysis',
  character_profile_confirm: 'Character profile',
  episode_split_llm: 'Episode split',
  screenplay_convert: 'Screenplay',
  voice_analyze: 'Dialogue analysis',
  image_character: 'Character image',
  image_location: 'Location image',
  image_panel: 'Storyboard image',
  panel_variant: 'Shot variant',
  modify_asset_image: 'Image edit',
  video_panel: 'Video clip',
  lip_sync: 'Lip sync',
  voice_line: 'Voice line',
  voice_design: 'Voice design',
  asset_hub_image: 'Asset image',
  asset_hub_ai_design_character: 'Character design',
  asset_hub_ai_design_location: 'Location design',
}

function describe(tx: Transaction): string {
  if (tx.type === 'adjust' || tx.type === 'recharge') {
    if ((tx.description || '').startsWith('signup bonus')) return 'Sign-up bonus'
    return tx.type === 'recharge' ? 'Credits added' : 'Credits adjusted'
  }
  if (tx.action && ACTIVITY_LABELS[tx.action]) return ACTIVITY_LABELS[tx.action]
  if (tx.action) return tx.action.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
  return 'Generation'
}

function formatCredits(value: number): string {
  const rounded = Math.round(value * 10) / 10
  return rounded.toLocaleString('en-US', { maximumFractionDigits: 1 })
}

/** Credit history: every charge and every credit added, newest first. */
export function UsageHistory() {
  const [page, setPage] = useState(1)
  const [data, setData] = useState<Page | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    setError(false)
    apiFetch(`/api/user/transactions?page=${page}&pageSize=15`)
      .then(async (res) => {
        if (!res.ok) throw new Error(String(res.status))
        const json = await res.json() as Page
        if (!cancelled) setData(json)
      })
      .catch(() => { if (!cancelled) setError(true) })
    return () => { cancelled = true }
  }, [page])

  const rows = (data?.transactions || []).filter((tx) => tx.type !== 'shadow_consume')

  return (
    <div>
      <h2 className="text-base font-semibold text-[#171717]">Credit history</h2>
      <p className="mt-1 text-sm text-[#737373]">Every generation and every credit added to your account.</p>

      {error && <p className="mt-4 text-sm text-red-500">Could not load your credit history.</p>}
      {!error && !data && <div className="mt-4 h-40 animate-pulse rounded-lg bg-[#f5f5f5]" />}
      {!error && data && rows.length === 0 && (
        <p className="mt-6 rounded-lg bg-[#fafafa] py-8 text-center text-sm text-[#737373]">No activity yet. Your first generation will appear here.</p>
      )}

      {!error && data && rows.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="border-b border-[#ececec] text-left text-xs uppercase tracking-wide text-[#737373]">
              <tr>
                <th className="py-2 pr-3 font-semibold">Date</th>
                <th className="py-2 pr-3 font-semibold">Activity</th>
                <th className="py-2 pr-3 font-semibold">Project</th>
                <th className="py-2 pr-3 text-right font-semibold">Credits</th>
                <th className="py-2 text-right font-semibold">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f5f5f5] text-[#404040]">
              {rows.map((tx) => {
                const added = tx.type !== 'consume'
                const amount = Math.abs(tx.amount)
                return (
                  <tr key={tx.id}>
                    <td className="py-2.5 pr-3 whitespace-nowrap text-[#737373]">
                      {new Date(tx.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </td>
                    <td className="py-2.5 pr-3">{describe(tx)}</td>
                    <td className="py-2.5 pr-3 text-[#737373]">
                      {tx.projectName ? `${tx.projectName}${tx.episodeNumber ? ` · Ep ${tx.episodeNumber}` : ''}` : '—'}
                    </td>
                    <td className={`py-2.5 pr-3 text-right font-semibold ${added ? 'text-emerald-600' : 'text-[#171717]'}`}>
                      {added ? '+' : '−'}{formatCredits(amount)}
                    </td>
                    <td className="py-2.5 text-right text-[#737373]">{formatCredits(tx.balanceAfter)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {data.pagination.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm">
              <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-lg border border-[#e5e5e5] px-3 py-1.5 disabled:opacity-40">Previous</button>
              <span className="text-[#737373]">Page {page} of {data.pagination.totalPages}</span>
              <button type="button" disabled={page >= data.pagination.totalPages} onClick={() => setPage(page + 1)} className="rounded-lg border border-[#e5e5e5] px-3 py-1.5 disabled:opacity-40">Next</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

'use client'

import { useCallback, useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api-fetch'
import { AFFILIATE_TIERS, percent, type AffiliateTier } from '@/lib/affiliate/program'
import { SITE } from '@/lib/site-config'
import type { AffiliateDashboard } from '@/lib/affiliate/service'

export type { AffiliateDashboard }

export const CARD = 'rounded-2xl border border-[#ececec] bg-white p-6 shadow-sm'
export const PRIMARY_BUTTON =
  'rounded-lg bg-gradient-to-r from-[#8020fc] to-[#5b3df5] px-4 py-2 text-sm font-semibold text-white shadow-md shadow-[#8020fc]/20 hover:brightness-110 transition disabled:opacity-50'
export const SECONDARY_BUTTON =
  'rounded-lg border border-[#e5e5e5] bg-white px-4 py-2 text-sm font-semibold text-[#171717] hover:bg-[#fafafa] transition'

export function formatUsd(value: number): string {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: value % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 })}`
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export type SaveResult = { ok: true } | { ok: false; field?: string; reason?: string }

export function useAffiliateDashboard() {
  const [dashboard, setDashboard] = useState<AffiliateDashboard | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    apiFetch('/api/affiliate/me')
      .then(async (res) => {
        if (!res.ok) throw new Error(String(res.status))
        const data = await res.json() as { dashboard: AffiliateDashboard }
        if (!cancelled) setDashboard(data.dashboard)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
    return () => { cancelled = true }
  }, [])

  const save = useCallback(async (body: Record<string, unknown>): Promise<SaveResult> => {
    try {
      const res = await apiFetch('/api/affiliate/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => null) as
        | { dashboard?: AffiliateDashboard; error?: { details?: { field?: string; reason?: string } } }
        | null
      if (res.ok && data?.dashboard) {
        setDashboard(data.dashboard)
        return { ok: true }
      }
      return { ok: false, field: data?.error?.details?.field, reason: data?.error?.details?.reason }
    } catch {
      return { ok: false }
    }
  }, [])

  return { dashboard, error, save }
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#8020fc]/[0.08] text-2xl">$</div>
      <p className="mt-4 font-semibold text-[#171717]">{title}</p>
      <p className="mt-1 text-sm text-[#737373]">{body}</p>
    </div>
  )
}

/** Tier ladder with the affiliate's current tier marked. */
export function TierLadder({ current }: { current?: AffiliateTier }) {
  return (
    <div>
      <p className="text-sm text-[#525252]">
        If you&apos;re an established creator, contact us at{' '}
        <a href={`mailto:${SITE.contactEmail}`} className="font-semibold text-[#8020fc] hover:underline">{SITE.contactEmail}</a>
      </p>
      <p className="mt-4 text-sm text-[#525252]">Reward percentage depends on the total revenue your referrals generate:</p>
      <ul className="mt-2 space-y-1.5">
        {AFFILIATE_TIERS.map((tier) => (
          <li key={tier.name} className="flex items-center gap-2 text-sm text-[#404040]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#8020fc]" />
            {tier.name} tier{tier.minRevenueUsd > 0 ? ` (${formatUsd(tier.minRevenueUsd)}+)` : ''} – {percent(tier.rate)}%
            {current?.name === tier.name && <span className="font-semibold italic text-[#8020fc]">→ you&apos;re here</span>}
          </li>
        ))}
      </ul>
    </div>
  )
}

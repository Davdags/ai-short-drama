'use client'

import { useEffect, useState } from 'react'
import Navbar from '@/components/Navbar'
import { apiFetch } from '@/lib/api-fetch'
import { AdminUsers } from './components/AdminUsers'
import { AdminAffiliates } from './components/AdminAffiliates'

interface WindowStats {
  signups: number
  verified: number
  creditsCharged: number
  evolinkCreditsUsed: number
  completed: number
  failed: number
  activeUsers: number
}

interface Summary {
  last24h: WindowStats
  last7d: WindowStats
  users: { total: number; verified: number; suspended: number }
  credits: { outstanding: number; spentAllTime: number }
  evolink: { accountCredits: number } | null
}

const CARD = 'rounded-2xl border border-[#ececec] bg-white p-6 shadow-sm'
const n = (value: number) => value.toLocaleString('en-US')

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-[#737373]">{label}</p>
      <p className="mt-1 text-2xl font-bold text-[#171717]">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-[#737373]">{hint}</p>}
    </div>
  )
}

export default function AdminPage() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [status, setStatus] = useState<'loading' | 'ok' | 'denied' | 'error'>('loading')

  useEffect(() => {
    apiFetch('/api/admin/summary')
      .then(async (res) => {
        if (res.status === 401 || res.status === 403) return setStatus('denied')
        if (!res.ok) return setStatus('error')
        setSummary(await res.json() as Summary)
        setStatus('ok')
      })
      .catch(() => setStatus('error'))
  }, [])

  return (
    <div className="min-h-screen bg-[#fafafa] font-sans">
      <div className="relative z-50"><Navbar /></div>
      <main className="mx-auto max-w-6xl space-y-5 px-4 py-10 sm:px-6">
        <div>
          <h1 className="text-3xl font-bold text-[#171717]">Admin</h1>
          <p className="mt-1 text-sm text-[#737373]">Owner dashboard — users, credits and affiliate payouts.</p>
        </div>

        {status === 'loading' && <div className="h-40 animate-pulse rounded-2xl bg-white" />}
        {status === 'denied' && <div className={CARD}><p className="text-sm text-[#404040]">This page is for the site owner. Your account does not have admin access.</p></div>}
        {status === 'error' && <div className={CARD}><p className="text-sm text-red-500">Could not load the dashboard. Please refresh.</p></div>}

        {status === 'ok' && summary && (
          <>
            <div className={`${CARD} grid gap-6 sm:grid-cols-2 lg:grid-cols-4`}>
              <Stat label="Sign-ups (24h)" value={n(summary.last24h.signups)} hint={`${n(summary.last24h.verified)} verified · ${n(summary.last7d.signups)} in 7 days`} />
              <Stat label="Credits used (24h)" value={n(summary.last24h.creditsCharged)} hint={`≈ ${n(summary.last24h.evolinkCreditsUsed)} EvoLink credits ≈ $${(summary.last24h.evolinkCreditsUsed * 0.0147).toFixed(2)} cost`} />
              <Stat label="Generations (24h)" value={n(summary.last24h.completed)} hint={`${n(summary.last24h.failed)} failed · ${n(summary.last24h.activeUsers)} active users`} />
              <Stat label="EvoLink balance" value={summary.evolink ? n(summary.evolink.accountCredits) : '—'} hint={summary.evolink ? 'EvoLink credits left' : 'no central key set'} />
            </div>

            <div className={`${CARD} grid gap-6 sm:grid-cols-2 lg:grid-cols-4`}>
              <Stat label="Total users" value={n(summary.users.total)} hint={`${n(summary.users.verified)} verified · ${n(summary.users.suspended)} suspended`} />
              <Stat label="Credits outstanding" value={n(summary.credits.outstanding)} hint="held by all users" />
              <Stat label="Credits used (all time)" value={n(summary.credits.spentAllTime)} />
              <Stat label="Last 7 days" value={`${n(summary.last7d.creditsCharged)} credits`} hint={`${n(summary.last7d.completed)} generations · ${n(summary.last7d.failed)} failed`} />
            </div>

            <div className={CARD}><AdminUsers /></div>
            <div className={CARD}><AdminAffiliates /></div>
          </>
        )}
      </main>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Navbar from '@/components/Navbar'
import { Link, useRouter } from '@/i18n/navigation'
import { apiFetch } from '@/lib/api-fetch'
import { SIGNUP_BONUS_CREDITS } from '@/lib/billing/credits-constants'
import { UsageHistory } from './components/UsageHistory'
import { ChangePasswordCard, DeleteAccountCard } from './components/SecurityCards'
import { BillingCard } from './components/BillingCard'
import { TopUpCard } from './components/TopUpCard'

interface AccountSummary {
  balance: number
  frozenAmount: number
  totalSpent: number
  emailVerified: boolean
  hasPassword: boolean
  username: string | null
  email: string | null
}

const CARD = 'rounded-2xl border border-[#ececec] bg-white p-6 shadow-sm'

function credits(value: number): string {
  return Math.max(0, Math.floor(value)).toLocaleString('en-US')
}

export default function AccountPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [summary, setSummary] = useState<AccountSummary | null>(null)
  const [resend, setResend] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const resendVerification = async () => {
    setResend('sending')
    const res = await apiFetch('/api/auth/resend-verification', { method: 'POST' }).catch(() => null)
    setResend(res?.ok ? 'sent' : 'error')
  }

  useEffect(() => {
    if (status === 'unauthenticated') router.push({ pathname: '/auth/signin' })
  }, [status, router])

  useEffect(() => {
    if (!session) return
    apiFetch('/api/user/balance')
      .then(async (res) => setSummary(await res.json() as AccountSummary))
      .catch(() => undefined)
  }, [session])

  return (
    <div className="min-h-screen bg-[#fafafa] font-sans">
      <div className="relative z-50"><Navbar /></div>
      <main className="mx-auto max-w-4xl space-y-5 px-4 py-10 sm:px-6">
        <div>
          <h1 className="text-3xl font-bold text-[#171717]">Account</h1>
          <p className="mt-1 text-sm text-[#737373]">
            {summary?.username ? <>Signed in as <span className="font-semibold text-[#404040]">{summary.username}</span>{summary.email ? ` · ${summary.email}` : ''}</> : ' '}
          </p>
        </div>

        <div className={CARD}><BillingCard /></div>

        {session && <div className={CARD}><TopUpCard /></div>}

        {summary && summary.email && !summary.emailVerified && (
          <div className="rounded-2xl border border-[#8020fc]/25 bg-[#8020fc]/[0.05] p-5">
            <p className="font-semibold text-[#171717]">Verify your email to unlock your {SIGNUP_BONUS_CREDITS} free credits</p>
            <p className="mt-1 text-sm text-[#525252]">We sent a link to {summary.email}. Tap it and your credits appear here straight away. Check spam if you can’t see it.</p>
            <button
              type="button"
              onClick={resendVerification}
              disabled={resend === 'sending' || resend === 'sent'}
              className="mt-3 rounded-xl bg-[#8020fc] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-70"
            >
              {resend === 'sent' ? 'Email sent ✓' : resend === 'sending' ? 'Sending…' : resend === 'error' ? 'Try again' : 'Resend the email'}
            </button>
          </div>
        )}

        <div className={`${CARD} grid gap-6 sm:grid-cols-2`}>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#737373]">Credits available</p>
            <p className="mt-1 text-2xl font-bold text-[#171717]">{summary ? credits(summary.balance) : '—'}</p>
            {summary && summary.frozenAmount >= 1 && <p className="mt-1 text-xs text-[#737373]">{credits(summary.frozenAmount)} reserved for running generations</p>}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#737373]">Credits used</p>
            <p className="mt-1 text-2xl font-bold text-[#171717]">{summary ? credits(summary.totalSpent) : '—'}</p>
            <p className="mt-1 text-xs text-[#737373]">All time</p>
          </div>
        </div>

        <div className={CARD}><UsageHistory /></div>

        {summary && (
          <>
            <div className={CARD}><ChangePasswordCard hasPassword={summary.hasPassword} /></div>
            <div className={CARD}>
              <p className="text-sm text-[#737373]">
                Model choices and email notifications are in{' '}
                <Link href={{ pathname: '/profile' }} className="font-semibold text-[#8020fc] hover:underline">Model preferences</Link>.
              </p>
            </div>
            {summary.username && <div className={CARD}><DeleteAccountCard username={summary.username} hasPassword={summary.hasPassword} /></div>}
          </>
        )}
      </main>
    </div>
  )
}

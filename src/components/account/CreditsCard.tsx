'use client'

import { useEffect, useState } from 'react'
import { Link } from '@/i18n/navigation'
import { apiFetch } from '@/lib/api-fetch'
import { SIGNUP_BONUS_CREDITS } from '@/lib/billing/credits-constants'

type BalanceState = { status: 'loading' } | { status: 'ready'; available: number; needsVerification: boolean } | { status: 'error' }

/** Current plan until subscriptions ship: every account is on Free. */
const CURRENT_PLAN = { name: 'Free', allowance: SIGNUP_BONUS_CREDITS }

function formatCredits(value: number): string {
  return Math.max(0, Math.floor(value)).toLocaleString('en-US')
}

/** Plan + credits summary shown at the top of the account menu. Loads the balance when mounted. */
export function CreditsCard({ onNavigate, onAdminDetected }: { onNavigate?: () => void; onAdminDetected?: (isAdmin: boolean) => void }) {
  const [state, setState] = useState<BalanceState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    apiFetch('/api/user/balance')
      .then(async (res) => {
        if (!res.ok) throw new Error(`balance ${res.status}`)
        const data = await res.json() as { balance?: number; emailVerified?: boolean; hasEmail?: boolean; isAdmin?: boolean }
        onAdminDetected?.(data.isAdmin === true)
        if (!cancelled) {
          setState({
            status: 'ready',
            available: Number(data.balance) || 0,
            needsVerification: data.hasEmail === true && data.emailVerified === false,
          })
        }
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error' })
      })
    return () => { cancelled = true }
  }, [])

  const [resend, setResend] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  async function resendVerification() {
    setResend('sending')
    const res = await apiFetch('/api/auth/resend-verification', { method: 'POST' }).catch(() => null)
    setResend(res?.ok ? 'sent' : 'error')
  }

  const available = state.status === 'ready' ? state.available : 0
  const percent = Math.min(100, (available / CURRENT_PLAN.allowance) * 100)

  return (
    <div className="mx-3 my-2 rounded-xl border border-[#8020fc]/15 bg-gradient-to-br from-[#8020fc]/[0.06] to-[#5b3df5]/[0.03] p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[#171717]">{CURRENT_PLAN.name} plan</span>
        <span className="text-xs text-[#525252]">
          {state.status === 'loading' && <span className="inline-block h-3 w-16 rounded bg-[#ede9fe] animate-pulse align-middle" />}
          {state.status === 'ready' && <><span className="font-semibold text-[#171717]">{formatCredits(available)}</span> credits left</>}
          {state.status === 'error' && 'Credits unavailable'}
        </span>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-[#ede9fe] overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#8020fc] to-[#5b3df5] transition-[width] duration-500"
          style={{ width: `${state.status === 'ready' ? percent : 0}%` }}
        />
      </div>
      {state.status === 'ready' && state.needsVerification && (
        <div className="mt-3 rounded-lg bg-white/80 p-2.5 text-[11px] leading-snug text-[#525252]">
          <span className="font-semibold text-[#8020fc]">Verify your email</span> to get {SIGNUP_BONUS_CREDITS} free credits.
          {' '}
          <button
            type="button"
            onClick={resendVerification}
            disabled={resend === 'sending' || resend === 'sent'}
            className="font-semibold text-[#171717] underline disabled:no-underline disabled:opacity-70"
          >
            {resend === 'sent' ? 'Email sent ✓' : resend === 'sending' ? 'Sending…' : resend === 'error' ? 'Try again' : 'Resend email'}
          </button>
        </div>
      )}
      <Link
        href={{ pathname: '/pricing' }}
        onClick={onNavigate}
        className="mt-3 block w-full rounded-lg bg-gradient-to-r from-[#8020fc] to-[#5b3df5] py-1.5 text-center text-xs font-semibold text-white hover:brightness-110 transition"
      >
        Upgrade
      </Link>
    </div>
  )
}

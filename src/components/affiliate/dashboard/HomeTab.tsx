'use client'

import { useEffect, useState } from 'react'
import { AppIcon, type AppIconName } from '@/components/ui/icons'
import { BRAND_NAME } from '@/components/BrandWordmark'
import { isValidReferralCode, percent, referralLink } from '@/lib/affiliate/program'
import { CARD, PRIMARY_BUTTON, SECONDARY_BUTTON, TierLadder, formatUsd, type AffiliateDashboard, type SaveResult } from './shared'

function StatBox({ icon, label, value }: { icon: AppIconName; label: string; value: string }) {
  return (
    <div className="flex items-center gap-4">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#8020fc]/[0.08]">
        <AppIcon name={icon} className="h-5 w-5 text-[#8020fc]" />
      </span>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-[#525252]">{label}</p>
        <p className="mt-0.5 text-2xl font-semibold text-[#171717]">{value}</p>
      </div>
    </div>
  )
}

function ReferralLinkRow({ code, onSave }: { code: string; onSave: (body: Record<string, unknown>) => Promise<SaveResult> }) {
  const [origin, setOrigin] = useState('')
  const [copied, setCopied] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(code)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  useEffect(() => setOrigin(window.location.origin), [])

  const link = origin ? referralLink(origin, code) : ''
  const shareText = encodeURIComponent(`Turn any story into a cinematic AI short drama with ${BRAND_NAME}`)

  async function copy() {
    if (!link) return
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function saveCode() {
    const next = draft.trim().toLowerCase()
    if (!isValidReferralCode(next)) return setError('Use 3–32 lowercase letters, numbers or hyphens.')
    setSaving(true)
    const result = await onSave({ code: next })
    setSaving(false)
    if (result.ok) {
      setEditing(false)
      setError('')
    } else {
      setError(result.reason === 'taken' ? 'That code is already taken.' : 'Could not save. Please try again.')
    }
  }

  if (editing) {
    return (
      <div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <span className="shrink-0 font-mono text-sm text-[#737373]">{origin}/en?ref=</span>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={32}
            autoFocus
            className="min-w-0 flex-1 rounded-lg border border-[#e5e5e5] px-3 py-2 font-mono text-sm outline-none focus:border-[#8020fc] focus:ring-2 focus:ring-[#8020fc]/15"
          />
          <div className="flex gap-2">
            <button type="button" onClick={saveCode} disabled={saving} className={PRIMARY_BUTTON}>{saving ? 'Saving…' : 'Save'}</button>
            <button type="button" onClick={() => { setEditing(false); setDraft(code); setError('') }} className={SECONDARY_BUTTON}>Cancel</button>
          </div>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <p className="mt-2 text-xs text-[#a3a3a3]">Changing your code stops your old link from tracking new visitors.</p>
      </div>
    )
  }

  const iconButton = 'flex h-10 w-10 items-center justify-center rounded-lg border border-[#e5e5e5] text-[#404040] hover:border-[#8020fc] hover:text-[#8020fc] transition'
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-2 text-sm text-[#404040]">
        <AppIcon name="link" className="h-4 w-4 shrink-0 text-[#a3a3a3]" />
        <span className="truncate font-mono">{link}</span>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={copy} className={iconButton} title="Copy link" aria-label="Copy link">
          <AppIcon name={copied ? 'check' : 'copy'} className="h-4 w-4" />
        </button>
        <a
          href={`https://twitter.com/intent/tweet?text=${shareText}&url=${encodeURIComponent(link)}`}
          target="_blank"
          rel="noopener noreferrer"
          className={`${iconButton} text-sm font-bold`}
          title="Share on X"
          aria-label="Share on X"
        >
          𝕏
        </a>
        <a
          href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`}
          target="_blank"
          rel="noopener noreferrer"
          className={`${iconButton} text-base font-bold`}
          title="Share on Facebook"
          aria-label="Share on Facebook"
        >
          f
        </a>
        <button type="button" onClick={() => setEditing(true)} className={iconButton} title="Edit code" aria-label="Edit referral code">
          <AppIcon name="edit" className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

export function HomeTab({
  dashboard,
  onSave,
  onOpenPayouts,
}: {
  dashboard: AffiliateDashboard
  onSave: (body: Record<string, unknown>) => Promise<SaveResult>
  onOpenPayouts: () => void
}) {
  const { stats, tier } = dashboard
  return (
    <div className="space-y-5">
      <div className={`${CARD} grid gap-6 sm:grid-cols-3`}>
        <StatBox icon="clock" label="Due in 7 days" value={formatUsd(stats.dueIn7DaysUsd)} />
        <StatBox icon="receipt" label="Total unpaid" value={formatUsd(stats.totalUnpaidUsd)} />
        <StatBox icon="badgeCheck" label="Total paid" value={formatUsd(stats.totalPaidUsd)} />
      </div>

      {!dashboard.payoutMethod && (
        <div className={`${CARD} flex flex-col gap-4 sm:flex-row sm:items-center`}>
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-50">
            <AppIcon name="alert" className="h-5 w-5 text-amber-500" />
          </span>
          <div className="flex-1">
            <p className="font-semibold text-[#171717]">You don&apos;t have a payout method selected.</p>
            <p className="text-sm text-[#737373]">Please select your payout method to get paid.</p>
          </div>
          <button type="button" onClick={onOpenPayouts} className={SECONDARY_BUTTON}>Select payout method</button>
        </div>
      )}

      <div className="rounded-2xl border-2 border-[#8020fc]/30 bg-gradient-to-br from-[#8020fc]/[0.04] to-white p-6">
        <h2 className="text-xl font-bold text-[#171717]">
          {BRAND_NAME} Affiliate Program: <span className="text-[#8020fc]">Member {tier.name}</span>
        </h2>
        <div className="mt-5 grid grid-cols-3 gap-4">
          {([['sparkles', stats.clicks, 'Clicks'], ['usersRound', stats.referrals, 'Referrals'], ['coins', stats.customers, 'Customers']] as const).map(
            ([icon, value, label]) => (
              <div key={label} className="flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:gap-2">
                <AppIcon name={icon} className="h-5 w-5 text-[#8020fc]" />
                <span className="text-xl font-bold text-[#171717]">{value}</span>
                <span className="text-sm text-[#737373]">{label}</span>
              </div>
            ),
          )}
        </div>
      </div>

      <div className={CARD}>
        <h3 className="mb-4 text-lg font-bold text-[#171717]">Referral link</h3>
        <ReferralLinkRow code={dashboard.code} onSave={onSave} />
      </div>

      <div className={CARD}>
        <h3 className="text-lg font-bold text-[#171717]">Rewards</h3>
        <p className="mt-3 flex items-center gap-2 text-sm text-[#404040]">
          <AppIcon name="badgeCheck" className="h-4 w-4 text-[#8020fc]" />
          {percent(tier.rate)}% recurring commission on every payment your referrals make
        </p>
        {dashboard.nextTier && (
          <p className="mt-2 text-xs text-[#737373]">
            {formatUsd(Math.max(0, dashboard.nextTier.minRevenueUsd - dashboard.revenueUsd))} more referred revenue to reach{' '}
            {dashboard.nextTier.name} ({percent(dashboard.nextTier.rate)}%).
          </p>
        )}
      </div>

      <div className={CARD}>
        <h3 className="mb-3 text-lg font-bold text-[#171717]">How to get higher rewards</h3>
        <TierLadder current={tier} />
      </div>
    </div>
  )
}

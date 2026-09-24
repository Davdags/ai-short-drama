'use client'

import { useState } from 'react'
import { AppIcon } from '@/components/ui/icons'
import { AFFILIATE_PROGRAM } from '@/lib/affiliate/program'
import { CARD, EmptyState, PRIMARY_BUTTON, SECONDARY_BUTTON, formatDate, formatUsd, type AffiliateDashboard, type SaveResult } from './shared'

const METHODS: Array<{ id: 'paypal' | 'bank' | 'crypto'; label: string; placeholder: string }> = [
  { id: 'paypal', label: 'PayPal', placeholder: 'Your PayPal email address' },
  { id: 'bank', label: 'Bank transfer', placeholder: 'Account name, bank name, account number, SWIFT/IBAN, country' },
  { id: 'crypto', label: 'USDT (crypto)', placeholder: 'Network (e.g. TRC20) and wallet address' },
]

function PayoutMethodForm({ dashboard, onSave, onDone }: {
  dashboard: AffiliateDashboard
  onSave: (body: Record<string, unknown>) => Promise<SaveResult>
  onDone: () => void
}) {
  const [method, setMethod] = useState(dashboard.payoutMethod || 'paypal')
  const [details, setDetails] = useState(dashboard.payoutDetails || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const selected = METHODS.find((m) => m.id === method) || METHODS[0]

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (details.trim().length < 3) return setError('Please enter your payout details.')
    setSaving(true)
    const result = await onSave({ payoutMethod: method, payoutDetails: details })
    setSaving(false)
    if (result.ok) onDone()
    else setError('Could not save. Please check your details and try again.')
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {METHODS.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMethod(m.id)}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${method === m.id ? 'border-[#8020fc] bg-[#8020fc]/[0.06] text-[#8020fc]' : 'border-[#e5e5e5] text-[#525252] hover:border-[#c4b5fd]'}`}
          >
            {m.label}
          </button>
        ))}
      </div>
      <textarea
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        rows={3}
        maxLength={1000}
        placeholder={selected.placeholder}
        className="w-full rounded-lg border border-[#e5e5e5] px-3 py-2 text-sm outline-none focus:border-[#8020fc] focus:ring-2 focus:ring-[#8020fc]/15"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className={PRIMARY_BUTTON}>{saving ? 'Saving…' : 'Save payout method'}</button>
        {dashboard.payoutMethod && <button type="button" onClick={onDone} className={SECONDARY_BUTTON}>Cancel</button>}
      </div>
    </form>
  )
}

export function PayoutsTab({ dashboard, onSave }: {
  dashboard: AffiliateDashboard
  onSave: (body: Record<string, unknown>) => Promise<SaveResult>
}) {
  const [editing, setEditing] = useState(!dashboard.payoutMethod)
  const current = METHODS.find((m) => m.id === dashboard.payoutMethod)

  return (
    <div className={CARD}>
      <h2 className="text-2xl font-bold text-[#171717]">Payouts</h2>
      <div className="mt-5 grid overflow-hidden rounded-xl border border-[#ececec] md:grid-cols-2">
        <div className="p-5">
          <p className="font-semibold text-[#171717]">Payout terms</p>
          <p className="mt-2 text-sm font-semibold text-[#404040]">Monthly / Net-{AFFILIATE_PROGRAM.netDays}</p>
          <p className="mt-1 text-sm text-[#737373]">
            This month&apos;s commissions will be paid {AFFILIATE_PROGRAM.netDays} days after the month ends if the payout
            amount is over {formatUsd(AFFILIATE_PROGRAM.minimumPayoutUsd)}.
          </p>
        </div>
        <div className="border-t border-[#ececec] p-5 md:border-l md:border-t-0">
          <p className="mb-3 font-semibold text-[#171717]">Selected payout method</p>
          {editing ? (
            <PayoutMethodForm dashboard={dashboard} onSave={onSave} onDone={() => setEditing(false)} />
          ) : (
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-semibold text-[#171717]">
                  <AppIcon name="checkSolid" className="h-4 w-4 text-[#8020fc]" />
                  {current?.label}
                </p>
                <p className="mt-1 whitespace-pre-line break-words text-sm text-[#737373]">{dashboard.payoutDetails}</p>
              </div>
              <button type="button" onClick={() => setEditing(true)} className={SECONDARY_BUTTON}>Change</button>
            </div>
          )}
        </div>
      </div>

      {dashboard.payouts.length === 0 ? (
        <EmptyState title="Payouts" body="You do not have any payouts yet." />
      ) : (
        <ul className="mt-5 divide-y divide-[#f5f5f5]">
          {dashboard.payouts.map((payout) => (
            <li key={payout.id} className="flex items-center justify-between py-3 text-sm">
              <span className="text-[#404040]">{formatDate(payout.paidAt)}{payout.reference ? ` · ${payout.reference}` : ''}</span>
              <span className="font-semibold text-[#171717]">{formatUsd(payout.amountUsd)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

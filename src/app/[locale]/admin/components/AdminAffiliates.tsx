'use client'

import { useCallback, useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api-fetch'

interface AffiliateRow {
  affiliateId: string
  code: string
  user: string
  email: string | null
  dueUsd: number
  commissions: number
  notYetDueUsd: number
  payoutMethod: string | null
  payoutDetails: string | null
  readyToPay: boolean
}

const TH = 'py-2 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-[#737373]'
const TD = 'py-2.5 pr-3 text-sm text-[#404040] align-top'

function usd(value: number): string {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/** Affiliate payouts: who is owed, and "Mark as paid" once you have sent the money. */
export function AdminAffiliates() {
  const [rows, setRows] = useState<AffiliateRow[]>([])
  const [minimum, setMinimum] = useState(50)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await apiFetch('/api/admin/affiliates').catch(() => null)
    if (!res?.ok) return setMessage('Could not load affiliates.')
    const data = await res.json() as { affiliates: AffiliateRow[]; minimumPayoutUsd: number }
    setRows(data.affiliates)
    setMinimum(data.minimumPayoutUsd)
  }, [])

  useEffect(() => { void load() }, [load])

  async function markPaid(row: AffiliateRow) {
    if (!window.confirm(`Record a ${usd(row.dueUsd)} payout to ${row.user}? Send the money first.`)) return
    const reference = window.prompt('Payment reference (e.g. PayPal transaction id):', '') || ''
    setBusy(row.affiliateId)
    setMessage('')
    const res = await apiFetch('/api/admin/affiliates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ affiliateId: row.affiliateId, reference }),
    }).catch(() => null)
    setBusy(null)
    setMessage(res?.ok ? `Recorded ${usd(row.dueUsd)} paid to ${row.user}.` : 'Could not record the payout.')
    if (res?.ok) await load()
  }

  return (
    <div>
      <h2 className="text-base font-semibold text-[#171717]">Affiliate payouts</h2>
      <p className="mt-1 text-sm text-[#737373]">Commissions become payable {60} days after the month they were earned. Minimum payout {usd(minimum)}.</p>
      {message && <p className="mt-3 text-sm text-[#8020fc]">{message}</p>}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[720px]">
          <thead className="border-b border-[#ececec]">
            <tr>
              <th className={TH}>Affiliate</th>
              <th className={TH}>Due now</th>
              <th className={TH}>Not yet due</th>
              <th className={TH}>Payout method</th>
              <th className={TH}>Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f5f5f5]">
            {rows.map((row) => (
              <tr key={row.affiliateId}>
                <td className={TD}>
                  <div className="font-medium text-[#171717]">{row.user}</div>
                  <div className="text-xs text-[#737373]">{row.email || 'no email'} · {row.code}</div>
                </td>
                <td className={`${TD} font-semibold text-[#171717]`}>{usd(row.dueUsd)}<div className="text-xs font-normal text-[#737373]">{row.commissions} commission(s)</div></td>
                <td className={TD}>{usd(row.notYetDueUsd)}</td>
                <td className={TD}>
                  {row.payoutMethod
                    ? <><div className="font-medium text-[#171717]">{row.payoutMethod}</div><div className="max-w-[240px] whitespace-pre-line break-words text-xs text-[#737373]">{row.payoutDetails}</div></>
                    : <span className="text-amber-600">not set</span>}
                </td>
                <td className={TD}>
                  <button
                    type="button"
                    disabled={!row.readyToPay || busy === row.affiliateId}
                    onClick={() => markPaid(row)}
                    className="rounded-lg bg-gradient-to-r from-[#8020fc] to-[#5b3df5] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
                  >
                    Mark as paid
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={5} className="py-8 text-center text-sm text-[#737373]">No affiliate commissions yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

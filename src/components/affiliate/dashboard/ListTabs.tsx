'use client'

import { CARD, EmptyState, formatDate, formatUsd, type AffiliateDashboard } from './shared'

const TH = 'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#737373]'
const TD = 'px-4 py-3 text-sm text-[#404040]'

const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700',
  paid: 'bg-emerald-50 text-emerald-700',
  void: 'bg-[#f5f5f5] text-[#737373]',
}
const STATUS_LABEL: Record<string, string> = { pending: 'Pending', paid: 'Paid', void: 'Refunded' }

export function ReferralsTab({ dashboard }: { dashboard: AffiliateDashboard }) {
  return (
    <div className={CARD}>
      <h2 className="text-2xl font-bold text-[#171717]">Referrals</h2>
      {dashboard.referrals.length === 0 ? (
        <EmptyState title="Referrals" body="You do not have any referrals yet. Share your link to get started." />
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[480px]">
            <thead className="border-b border-[#ececec]">
              <tr><th className={TH}>Customer</th><th className={TH}>Signed up</th><th className={TH}>Status</th></tr>
            </thead>
            <tbody className="divide-y divide-[#f5f5f5]">
              {dashboard.referrals.map((referral) => (
                <tr key={referral.id}>
                  <td className={TD}>{referral.customer}</td>
                  <td className={TD}>{formatDate(referral.joinedAt)}</td>
                  <td className={TD}>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${referral.paying ? 'bg-emerald-50 text-emerald-700' : 'bg-[#f5f5f5] text-[#737373]'}`}>
                      {referral.paying ? 'Customer' : 'Signed up'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export function CommissionsTab({ dashboard }: { dashboard: AffiliateDashboard }) {
  return (
    <div className={CARD}>
      <h2 className="text-2xl font-bold text-[#171717]">Commissions</h2>
      {dashboard.commissions.length === 0 ? (
        <EmptyState title="Commissions" body="You do not have any commissions yet." />
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead className="border-b border-[#ececec]">
              <tr>
                <th className={TH}>Date</th><th className={TH}>Customer</th><th className={TH}>Payment</th>
                <th className={TH}>Commission</th><th className={TH}>Payable from</th><th className={TH}>Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f5f5f5]">
              {dashboard.commissions.map((commission) => (
                <tr key={commission.id}>
                  <td className={TD}>{formatDate(commission.createdAt)}</td>
                  <td className={TD}>{commission.customer}</td>
                  <td className={TD}>{formatUsd(commission.paymentUsd)}</td>
                  <td className={`${TD} font-semibold text-[#171717]`}>
                    {formatUsd(commission.amountUsd)} <span className="font-normal text-[#a3a3a3]">({commission.ratePercent}%)</span>
                  </td>
                  <td className={TD}>{formatDate(commission.availableAt)}</td>
                  <td className={TD}>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[commission.status] || STATUS_STYLE.void}`}>
                      {STATUS_LABEL[commission.status] || commission.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

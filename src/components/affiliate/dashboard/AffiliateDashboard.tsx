'use client'

import { useState } from 'react'
import { HomeTab } from './HomeTab'
import { CommissionsTab, ReferralsTab } from './ListTabs'
import { PayoutsTab } from './PayoutsTab'
import { ReportsTab } from './ReportsTab'
import { useAffiliateDashboard } from './shared'

const TABS = ['Home', 'Referrals', 'Commissions', 'Payouts', 'Reports'] as const
type Tab = typeof TABS[number]

export function AffiliateDashboard() {
  const { dashboard, error, save } = useAffiliateDashboard()
  const [tab, setTab] = useState<Tab>('Home')

  if (error) {
    return <p className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-600">Could not load your affiliate dashboard. Please refresh the page.</p>
  }
  if (!dashboard) {
    return <div className="h-96 animate-pulse rounded-2xl bg-[#f5f5f5]" />
  }

  return (
    <div>
      <nav className="mb-6 flex gap-1 overflow-x-auto [scrollbar-width:none] sm:justify-center [&::-webkit-scrollbar]:hidden">
        {TABS.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => setTab(name)}
            className={`shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition ${tab === name ? 'bg-[#8020fc]/[0.08] text-[#8020fc]' : 'text-[#525252] hover:bg-[#f5f5f5] hover:text-[#171717]'}`}
          >
            {name}
          </button>
        ))}
      </nav>
      {tab === 'Home' && <HomeTab dashboard={dashboard} onSave={save} onOpenPayouts={() => setTab('Payouts')} />}
      {tab === 'Referrals' && <ReferralsTab dashboard={dashboard} />}
      {tab === 'Commissions' && <CommissionsTab dashboard={dashboard} />}
      {tab === 'Payouts' && <PayoutsTab dashboard={dashboard} onSave={save} />}
      {tab === 'Reports' && <ReportsTab dashboard={dashboard} />}
    </div>
  )
}

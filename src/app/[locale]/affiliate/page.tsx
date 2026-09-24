'use client'

import { useSession } from 'next-auth/react'
import Navbar from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { Link } from '@/i18n/navigation'
import { AppIcon, type AppIconName } from '@/components/ui/icons'
import { AffiliateDashboard } from '@/components/affiliate/dashboard/AffiliateDashboard'
import { TierLadder, formatUsd } from '@/components/affiliate/dashboard/shared'
import { AFFILIATE_PROGRAM, AFFILIATE_TIERS, percent } from '@/lib/affiliate/program'

const GRADIENT_TEXT = 'bg-gradient-to-r from-[#8020fc] via-[#a13cf0] to-[#5b3df5] bg-clip-text text-transparent'
const PRIMARY_BUTTON = 'bg-gradient-to-r from-[#8020fc] to-[#5b3df5] text-white shadow-lg shadow-[#8020fc]/25 hover:brightness-110'

const START_PERCENT = percent(AFFILIATE_TIERS[0].rate)
const TOP_PERCENT = percent(AFFILIATE_TIERS[AFFILIATE_TIERS.length - 1].rate)

const STEPS: Array<{ icon: AppIconName; title: string; body: string }> = [
  { icon: 'link', title: 'Share your link', body: 'Post it anywhere — social, YouTube, your community, your newsletter.' },
  { icon: 'usersRound', title: 'They subscribe', body: `Anyone who signs up within ${AFFILIATE_PROGRAM.cookieDays} days of clicking your link is yours.` },
  { icon: 'coins', title: `Earn up to ${TOP_PERCENT}%`, body: `Recurring commission on every payment they make, starting at ${START_PERCENT}%.` },
]

const TERMS = [
  `${START_PERCENT}–${TOP_PERCENT}% recurring commission on every payment a referred customer makes, rising with your tier`,
  'Commission is earned on completed payments only — not on free sign-ups',
  'Refunded payments are removed from your commissions',
  `Paid monthly, Net-${AFFILIATE_PROGRAM.netDays}, once your balance is over ${formatUsd(AFFILIATE_PROGRAM.minimumPayoutUsd)}`,
  'Self-referrals and paid ads bidding on the NucleusArt name are not allowed',
]

function PublicPitch() {
  return (
    <>
      <div className="rounded-2xl border border-[#e5e5e5] bg-[#fafafa] p-8 text-center">
        <p className="text-lg font-semibold text-[#171717]">Get your personal referral link</p>
        <p className="mt-2 text-sm text-[#737373]">Create a free account to start earning.</p>
        <Link href={{ pathname: '/auth/signup' }} className={`mt-6 inline-block rounded-xl px-8 py-3 text-sm font-semibold transition-all ${PRIMARY_BUTTON}`}>
          Join the affiliate program
        </Link>
      </div>

      <div className="mt-16 grid gap-6 md:grid-cols-3">
        {STEPS.map((step, index) => (
          <div key={step.title} className="rounded-2xl border border-[#e5e5e5] bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#8020fc]/10">
                <AppIcon name={step.icon} className="h-5 w-5 text-[#8020fc]" />
              </span>
              <span className="text-sm font-semibold text-[#a3a3a3]">Step {index + 1}</span>
            </div>
            <h2 className="mt-4 text-lg font-bold text-[#171717]">{step.title}</h2>
            <p className="mt-1 text-sm text-[#737373]">{step.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-[#e5e5e5] bg-white p-6 shadow-sm sm:p-8">
          <h2 className="mb-4 text-lg font-bold text-[#171717]">Reward tiers</h2>
          <TierLadder />
        </div>
        <div className="rounded-2xl border border-[#e5e5e5] bg-[#fafafa] p-6 sm:p-8">
          <h2 className="text-lg font-bold text-[#171717]">Program terms</h2>
          <ul className="mt-4 flex flex-col gap-3">
            {TERMS.map((term) => (
              <li key={term} className="flex items-start gap-3 text-sm text-[#404040]">
                <AppIcon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-[#8020fc]" />
                {term}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  )
}

export default function AffiliatePage() {
  const { data: session, status } = useSession()

  return (
    <div className="min-h-screen bg-white font-sans">
      <div className="relative z-50">
        <Navbar />
      </div>

      <main className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-48 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-[#8020fc]/10 blur-[140px]" />

        <section className="relative mx-auto max-w-5xl px-4 pb-20 pt-12 sm:px-6 lg:pt-16">
          <div className="mb-10 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#8020fc]">Affiliate Program</p>
            <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-[#171717] sm:text-5xl">
              Share NucleusArt. <span className={GRADIENT_TEXT}>Earn up to {TOP_PERCENT}%.</span>
            </h1>
            {!session && (
              <p className="mx-auto mt-5 max-w-2xl text-lg text-[#737373]">
                Recurring commission on every payment your referrals make. Paid out monthly.
              </p>
            )}
          </div>

          {status === 'loading' ? (
            <div className="h-48 animate-pulse rounded-2xl bg-[#f5f5f5]" />
          ) : session ? (
            <AffiliateDashboard />
          ) : (
            <PublicPitch />
          )}
        </section>
      </main>

      <Footer />
    </div>
  )
}

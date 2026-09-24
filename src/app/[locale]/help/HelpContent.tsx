'use client'

import { useMemo, useState } from 'react'
import Navbar from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { Link } from '@/i18n/navigation'
import { AppIcon } from '@/components/ui/icons'
import { SITE } from '@/lib/site-config'
import { FAQ_CATEGORIES, type FaqItem } from './faq-data'

const CARD = 'rounded-2xl border border-[#ececec] bg-white'

function Question({ item, open, onToggle }: { item: FaqItem; open: boolean; onToggle: () => void }) {
  return (
    <div className="border-b border-[#f0f0f0] last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-start justify-between gap-4 px-4 py-4 text-left sm:px-5"
      >
        <span className="text-[15px] font-medium text-[#171717]">{item.q}</span>
        <AppIcon
          name="chevronDown"
          className={`mt-1 h-4 w-4 shrink-0 text-[#a3a3a3] transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <p className="px-4 pb-5 text-[15px] leading-relaxed text-[#525252] sm:px-5">{item.a}</p>
      )}
    </div>
  )
}

export function HelpContent() {
  const [query, setQuery] = useState('')
  const [openKeys, setOpenKeys] = useState<Set<string>>(new Set())

  const search = query.trim().toLowerCase()
  const categories = useMemo(() => {
    if (!search) return FAQ_CATEGORIES
    return FAQ_CATEGORIES
      .map((category) => ({
        ...category,
        items: category.items.filter(
          (item) => item.q.toLowerCase().includes(search) || item.a.toLowerCase().includes(search),
        ),
      }))
      .filter((category) => category.items.length > 0)
  }, [search])

  const matchCount = categories.reduce((total, category) => total + category.items.length, 0)

  const toggle = (key: string) => {
    setOpenKeys((previous) => {
      const next = new Set(previous)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <div className="min-h-screen bg-white font-sans">
      <div className="relative z-50"><Navbar /></div>

      <main className="mx-auto max-w-3xl px-4 pb-20 pt-10 sm:px-6 lg:pt-14">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#8020fc]">Help</p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-[#171717] sm:text-4xl">
          How can we help?
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-[#525252]">
          Answers to the questions we get asked most. Still stuck? Email us and a human will reply.
        </p>

        <div className="relative mt-6">
          <AppIcon name="search" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a3a3a3]" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search for an answer"
            aria-label="Search help articles"
            className="w-full rounded-xl border border-[#e5e5e5] bg-white py-3 pl-11 pr-4 text-[15px] text-[#171717] outline-none transition-colors placeholder:text-[#a3a3a3] focus:border-[#8020fc]"
          />
        </div>

        {search && (
          <p className="mt-3 text-sm text-[#737373]">
            {matchCount === 0
              ? 'No answers matched that. Try a different word, or email us below.'
              : `${matchCount} ${matchCount === 1 ? 'answer' : 'answers'} found`}
          </p>
        )}

        {!search && (
          <nav className={`${CARD} mt-6 p-4 sm:p-5`}>
            <p className="text-sm font-semibold text-[#171717]">Jump to</p>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {FAQ_CATEGORIES.map((category) => (
                <li key={category.id}>
                  <a
                    href={`#${category.id}`}
                    className="-mx-2 flex min-h-[40px] items-center rounded-lg px-2 text-sm text-[#525252] transition-colors hover:bg-[#8020fc]/[0.06] hover:text-[#8020fc]"
                  >
                    {category.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}

        <div className="mt-8 space-y-8">
          {categories.map((category) => (
            <section key={category.id} id={category.id} className="scroll-mt-20">
              <h2 className="text-xl font-bold text-[#171717]">{category.title}</h2>
              <p className="mt-1 text-sm text-[#737373]">{category.blurb}</p>
              <div className={`${CARD} mt-4 overflow-hidden`}>
                {category.items.map((item) => {
                  const key = `${category.id}:${item.q}`
                  return (
                    <Question
                      key={key}
                      item={item}
                      open={openKeys.has(key) || Boolean(search)}
                      onToggle={() => toggle(key)}
                    />
                  )
                })}
              </div>
            </section>
          ))}
        </div>

        <section className="mt-12 rounded-2xl border border-[#8020fc]/20 bg-[#8020fc]/[0.04] p-5 sm:p-7">
          <h2 className="text-xl font-bold text-[#171717]">Still need help?</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-[#525252]">
            Email us with your username and what you were doing when it went wrong. We reply within
            one business day, and faster on paid plans.
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <a
              href={`mailto:${SITE.contactEmail}`}
              className="inline-flex items-center justify-center gap-2 break-all rounded-xl bg-gradient-to-r from-[#8020fc] to-[#5b3df5] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#8020fc]/25 transition-all hover:brightness-110"
            >
              {SITE.contactEmail}
            </a>
            <Link
              href={{ pathname: '/pricing' }}
              className="inline-flex items-center justify-center rounded-xl border border-[#8020fc]/40 px-5 py-3 text-sm font-semibold text-[#7019e0] transition-colors hover:bg-[#8020fc]/[0.06]"
            >
              See plans and credits
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

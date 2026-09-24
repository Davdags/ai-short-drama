import type { ReactNode } from 'react'
import Navbar from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { Link } from '@/i18n/navigation'

/** Page frame for the Resources section: Blog, Updates, Prompt Library. */

const TABS = [
  { href: '/blog', label: 'Blog' },
  { href: '/updates', label: 'Updates' },
  { href: '/prompts', label: 'Prompt Library' },
  { href: '/help', label: 'Help Centre' },
] as const

export function ResourcesShell({ active, title, intro, children }: {
  active: (typeof TABS)[number]['href']
  title: string
  intro?: string
  children: ReactNode
}) {
  return (
    <div className="min-h-screen bg-white font-sans">
      <div className="relative z-50">
        <Navbar />
      </div>
      <main className="mx-auto max-w-5xl px-4 pb-20 pt-10 sm:px-6">
        <nav aria-label="Resources" className="mb-8 flex flex-wrap gap-2">
          {TABS.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                tab.href === active
                  ? 'border-[#171717] bg-[#171717] text-white'
                  : 'border-[#e5e5e5] text-[#525252] hover:border-[#d4d4d4] hover:text-[#171717]'
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
        <h1 className="text-3xl font-bold tracking-tight text-[#171717] sm:text-4xl">{title}</h1>
        {intro && <p className="mt-3 max-w-2xl text-base leading-relaxed text-[#525252]">{intro}</p>}
        <div className="mt-10">{children}</div>
      </main>
      <Footer />
    </div>
  )
}

export function formatDate(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

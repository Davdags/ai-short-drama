import type { ReactNode } from 'react'
import Navbar from '@/components/Navbar'
import { Footer } from '@/components/Footer'

export const LEGAL_EFFECTIVE_DATE = 'September 25, 2026'

export interface LegalSection {
  title: string
  body: ReactNode
}

/** Shared layout for Terms, Privacy and Refund Policy (white + purple, readable column). */
export function LegalPage({ title, intro, sections }: { title: string; intro: ReactNode; sections: LegalSection[] }) {
  return (
    <div className="min-h-screen bg-white font-sans">
      <div className="relative z-50">
        <Navbar />
      </div>
      <main className="mx-auto max-w-3xl px-4 pb-20 pt-12 sm:px-6 lg:pt-16">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#8020fc]">Legal</p>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-[#171717]">{title}</h1>
        <p className="mt-2 text-sm text-[#737373]">Effective {LEGAL_EFFECTIVE_DATE}</p>
        <div className="mt-6 text-[15px] leading-relaxed text-[#404040]">{intro}</div>

        <nav className="mt-8 rounded-xl border border-[#ececec] bg-[#fafafa] p-5">
          <p className="text-sm font-semibold text-[#171717]">Contents</p>
          <ol className="mt-2 grid gap-1 text-sm text-[#525252] sm:grid-cols-2">
            {sections.map((section, index) => (
              <li key={section.title}>
                <a href={`#section-${index + 1}`} className="hover:text-[#8020fc]">{index + 1}. {section.title}</a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="mt-10 space-y-9">
          {sections.map((section, index) => (
            <section key={section.title} id={`section-${index + 1}`} className="scroll-mt-24">
              <h2 className="text-xl font-bold text-[#171717]">{index + 1}. {section.title}</h2>
              <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-[#404040] [&_li]:ml-5 [&_li]:list-disc [&_a]:text-[#8020fc] [&_a]:underline">
                {section.body}
              </div>
            </section>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  )
}

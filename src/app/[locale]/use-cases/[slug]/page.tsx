import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { Link } from '@/i18n/navigation'
import { LANDING_PAGES, findLandingPage } from '@/content/landing-pages'
import { findPrompt } from '@/content/prompt-library'

export function generateStaticParams() {
  return LANDING_PAGES.map((page) => ({ slug: page.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const page = findLandingPage((await params).slug)
  if (!page) return {}
  return {
    title: page.metaTitle,
    description: page.metaDescription,
    alternates: { canonical: `/en/use-cases/${page.slug}` },
    openGraph: { title: page.metaTitle, description: page.metaDescription },
  }
}

export default async function UseCasePage({ params }: { params: Promise<{ slug: string }> }) {
  const page = findLandingPage((await params).slug)
  if (!page) notFound()
  const examples = page.examples.map((slug) => findPrompt(slug)).filter((prompt) => prompt !== undefined)
  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: page.faqs.map((faq) => ({ '@type': 'Question', name: faq.q, acceptedAnswer: { '@type': 'Answer', text: faq.a } })),
  }

  return (
    <div className="min-h-screen bg-white font-sans">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <div className="relative z-50"><Navbar /></div>
      <main className="mx-auto max-w-5xl px-4 pb-20 pt-12 sm:px-6">
        <h1 className="max-w-3xl text-3xl font-extrabold tracking-tight text-[#171717] sm:text-5xl">{page.headline}</h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-[#525252]">{page.intro}</p>
        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Link href={{ pathname: '/auth/signup' }} className="rounded-full bg-[#8020fc] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#6d12e0]">
            Start free — 150 credits
          </Link>
          <Link href={{ pathname: '/prompts' }} className="rounded-full border border-[#e5e5e5] px-5 py-2.5 text-sm font-semibold text-[#171717] hover:border-[#d4c2ff]">
            Browse story prompts
          </Link>
        </div>

        <section className="mt-14 grid gap-4 sm:grid-cols-2">
          {page.benefits.map((benefit) => (
            <div key={benefit.title} className="rounded-2xl border border-[#ececec] p-5">
              <h2 className="font-semibold text-[#171717]">{benefit.title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-[#525252]">{benefit.body}</p>
            </div>
          ))}
        </section>

        <section className="mt-14">
          <h2 className="text-xl font-semibold text-[#171717]">How it works</h2>
          <ol className="mt-4 grid gap-3 sm:grid-cols-4">
            {page.steps.map((step, index) => (
              <li key={step} className="rounded-2xl bg-[#faf7ff] p-4">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#8020fc] text-sm font-semibold text-white">{index + 1}</span>
                <p className="mt-3 text-sm font-medium text-[#262626]">{step}</p>
              </li>
            ))}
          </ol>
        </section>

        {examples.length > 0 && (
          <section className="mt-14">
            <h2 className="text-xl font-semibold text-[#171717]">Start from a ready-made story</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              {examples.map((prompt) => (
                <Link key={prompt.slug} href={{ pathname: `/prompts/${prompt.slug}` }} className="group overflow-hidden rounded-2xl border border-[#ececec] hover:border-[#d4c2ff]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/images/prompts/${prompt.slug}.jpg`} alt={prompt.title} loading="lazy" className="aspect-[4/5] w-full object-cover" />
                  <div className="p-4">
                    <p className="font-semibold text-[#171717] group-hover:text-[#5b12c4]">{prompt.title}</p>
                    <p className="mt-1 text-sm text-[#525252]">{prompt.logline}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="mt-14 max-w-3xl">
          <h2 className="text-xl font-semibold text-[#171717]">Questions</h2>
          <dl className="mt-4 divide-y divide-[#f0f0f0] rounded-2xl border border-[#ececec]">
            {page.faqs.map((faq) => (
              <div key={faq.q} className="p-5">
                <dt className="font-medium text-[#171717]">{faq.q}</dt>
                <dd className="mt-1.5 text-sm leading-relaxed text-[#525252]">{faq.a}</dd>
              </div>
            ))}
          </dl>
        </section>
      </main>
      <Footer />
    </div>
  )
}

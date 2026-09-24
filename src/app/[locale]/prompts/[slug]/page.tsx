import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { BRAND_NAME } from '@/components/BrandWordmark'
import { Link } from '@/i18n/navigation'
import { ResourcesShell } from '@/components/resources/ResourcesShell'
import { STORY_PROMPTS, findPrompt, genreInfo, promptsByGenre } from '@/content/prompt-library'

export function generateStaticParams() {
  return STORY_PROMPTS.map((prompt) => ({ slug: prompt.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const prompt = findPrompt((await params).slug)
  if (!prompt) return {}
  return {
    title: `${prompt.title}: ${genreInfo(prompt.genre).label} short drama prompt | ${BRAND_NAME}`,
    description: prompt.logline,
    alternates: { canonical: `/en/prompts/${prompt.slug}` },
    openGraph: { title: prompt.title, description: prompt.logline, images: [`/images/prompts/${prompt.slug}.jpg`] },
  }
}

export default async function PromptPage({ params }: { params: Promise<{ slug: string }> }) {
  const prompt = findPrompt((await params).slug)
  if (!prompt) notFound()
  const genre = genreInfo(prompt.genre)
  const more = promptsByGenre(prompt.genre).filter((entry) => entry.slug !== prompt.slug).slice(0, 3)

  return (
    <ResourcesShell active="/prompts" title={prompt.title}>
      <div className="-mt-6 grid gap-8 md:grid-cols-[minmax(0,1fr)_280px]">
        <div>
          <p className="text-sm text-[#737373]">
            <Link href={{ pathname: '/prompts' }} className="hover:underline">Prompt Library</Link> · {genre.label} · {prompt.seconds}s
          </p>
          <p className="mt-4 text-lg text-[#404040]">{prompt.logline}</p>
          <div className="mt-6 rounded-2xl border border-[#ececec] bg-[#fafafa] p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#a3a3a3]">Story</p>
            <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-[#262626]">{prompt.story}</p>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href={{ pathname: '/start', query: { prompt: prompt.slug } }}
              className="rounded-full bg-[#8020fc] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#6d12e0]"
            >
              Use this prompt
            </Link>
            <span className="text-sm text-[#737373]">Opens a new project with this story. You can edit everything.</span>
          </div>
        </div>
        <aside>
          <div className="overflow-hidden rounded-2xl border border-[#ececec]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/images/prompts/${prompt.slug}.jpg`} alt={`${prompt.title} — example picture`} className="aspect-[4/5] w-full object-cover" />
          </div>
          <p className="mt-2 text-xs text-[#a3a3a3]">Example picture made with {BRAND_NAME}.</p>
        </aside>
      </div>
      {more.length > 0 && (
        <section className="mt-14">
          <h2 className="text-lg font-semibold text-[#171717]">More {genre.label.toLowerCase()} stories</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {more.map((entry) => (
              <Link key={entry.slug} href={{ pathname: `/prompts/${entry.slug}` }} className="rounded-2xl border border-[#ececec] p-4 hover:border-[#d4c2ff]">
                <p className="font-semibold text-[#171717]">{entry.title}</p>
                <p className="mt-1 text-sm text-[#525252]">{entry.logline}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </ResourcesShell>
  )
}

import type { Metadata } from 'next'
import { BRAND_NAME } from '@/components/BrandWordmark'
import { Link } from '@/i18n/navigation'
import { ResourcesShell } from '@/components/resources/ResourcesShell'
import { PROMPT_GENRES, promptsByGenre } from '@/content/prompt-library'

export const metadata: Metadata = {
  title: `Prompt Library: AI short drama story ideas | ${BRAND_NAME}`,
  description: 'Ready-made short drama stories — romance, CEO revenge, thriller, comedy, horror, family and Nollywood-style — you can turn into a video in one click.',
  alternates: { canonical: '/en/prompts' },
}

export default function PromptLibraryPage() {
  return (
    <ResourcesShell
      active="/prompts"
      title="Prompt Library"
      intro="Ready-made short drama stories. Pick one, press “Use this prompt”, and change anything you like — every story is short enough for the free trial."
    >
      <nav aria-label="Genres" className="-mt-4 mb-10 flex flex-wrap gap-2">
        {PROMPT_GENRES.map((genre) => (
          <a key={genre.id} href={`#${genre.id}`} className="rounded-full bg-[#f5f5f5] px-3 py-1 text-sm text-[#525252] hover:bg-[#ececec] hover:text-[#171717]">
            {genre.label}
          </a>
        ))}
      </nav>
      <div className="space-y-14">
        {PROMPT_GENRES.map((genre) => (
          <section key={genre.id} id={genre.id} className="scroll-mt-24">
            <h2 className="text-xl font-semibold text-[#171717]">{genre.label}</h2>
            <p className="mt-1 text-sm text-[#737373]">{genre.blurb}</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {promptsByGenre(genre.id).map((prompt) => (
                <Link
                  key={prompt.slug}
                  href={{ pathname: `/prompts/${prompt.slug}` }}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-[#ececec] transition-colors hover:border-[#d4c2ff]"
                >
                  <div className="aspect-[4/5] w-full overflow-hidden bg-[#f5f5f5]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/images/prompts/${prompt.slug}.jpg`}
                      alt={prompt.title}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <h3 className="font-semibold text-[#171717] group-hover:text-[#5b12c4]">{prompt.title}</h3>
                    <p className="mt-1 flex-1 text-sm leading-relaxed text-[#525252]">{prompt.logline}</p>
                    <p className="mt-3 text-xs text-[#a3a3a3]">{prompt.seconds}s · {prompt.style === 'realistic' ? 'Realistic' : prompt.style === 'japanese-anime' ? 'Anime' : 'Comic'}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </ResourcesShell>
  )
}

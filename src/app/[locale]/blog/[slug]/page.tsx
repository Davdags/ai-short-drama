import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { BRAND_NAME } from '@/components/BrandWordmark'
import { Link } from '@/i18n/navigation'
import { ResourcesShell, formatDate } from '@/components/resources/ResourcesShell'
import { findPost, publishedPosts, type BlogBlock } from '@/content/blog'
import { getPublicBaseUrl } from '@/lib/env'

export function generateStaticParams() {
  return publishedPosts().map((post) => ({ slug: post.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const post = findPost((await params).slug)
  if (!post) return {}
  return {
    title: `${post.title} | ${BRAND_NAME}`,
    description: post.description,
    alternates: { canonical: `/en/blog/${post.slug}` },
    openGraph: { type: 'article', title: post.title, description: post.description, publishedTime: post.date },
  }
}

function Block({ block }: { block: BlogBlock }) {
  switch (block.type) {
    case 'h2':
      return <h2 className="mt-10 text-xl font-semibold text-[#171717]">{block.text}</h2>
    case 'list':
      return (
        <ul className="mt-4 list-disc space-y-2 pl-5 text-[16px] leading-relaxed text-[#404040]">
          {block.items.map((item) => <li key={item}>{item}</li>)}
        </ul>
      )
    case 'tip':
      return <p className="mt-6 rounded-xl border border-[#ece3ff] bg-[#faf7ff] p-4 text-[15px] leading-relaxed text-[#404040]">{block.text}</p>
    default:
      return <p className="mt-4 text-[16px] leading-relaxed text-[#404040]">{block.text}</p>
  }
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const post = findPost((await params).slug)
  if (!post) notFound()

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    author: { '@type': 'Organization', name: BRAND_NAME },
    publisher: { '@type': 'Organization', name: BRAND_NAME },
    mainEntityOfPage: `${getPublicBaseUrl()}/en/blog/${post.slug}`,
  }

  return (
    <ResourcesShell active="/blog" title={post.title}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <article className="max-w-2xl">
        <p className="-mt-6 text-sm text-[#a3a3a3]">{formatDate(post.date)} · {post.readingMinutes} min read</p>
        {post.body.map((block, index) => <Block key={index} block={block} />)}
        <div className="mt-12 rounded-2xl bg-[#171717] p-6 text-white">
          <p className="text-lg font-semibold">Make your first short drama free</p>
          <p className="mt-1 text-sm text-white/70">New accounts get 150 credits — enough for a script, a storyboard and your first pictures.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href={{ pathname: '/auth/signup' }} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#171717]">Start free</Link>
            <Link href={{ pathname: '/prompts' }} className="rounded-full border border-white/30 px-4 py-2 text-sm font-semibold text-white">Browse story prompts</Link>
          </div>
        </div>
      </article>
    </ResourcesShell>
  )
}

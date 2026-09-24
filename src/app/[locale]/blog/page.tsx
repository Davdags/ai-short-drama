import type { Metadata } from 'next'
import { BRAND_NAME } from '@/components/BrandWordmark'
import { Link } from '@/i18n/navigation'
import { ResourcesShell, formatDate } from '@/components/resources/ResourcesShell'
import { publishedPosts } from '@/content/blog'

export const metadata: Metadata = {
  title: `Blog | ${BRAND_NAME}`,
  description: `Guides, ideas and tips for making AI short dramas with ${BRAND_NAME}.`,
  alternates: { canonical: '/en/blog' },
}

export default function BlogIndexPage() {
  const posts = publishedPosts()
  return (
    <ResourcesShell active="/blog" title="Blog" intro="Guides, story ideas and tips for making short dramas with AI.">
      <div className="grid gap-5 sm:grid-cols-2">
        {posts.map((post) => (
          <Link
            key={post.slug}
            href={{ pathname: `/blog/${post.slug}` }}
            className="group flex flex-col rounded-2xl border border-[#ececec] p-6 transition-colors hover:border-[#d4c2ff] hover:bg-[#fcfaff]"
          >
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-[#f3ecff] px-2.5 py-0.5 text-xs font-medium text-[#5b12c4]">{tag}</span>
              ))}
            </div>
            <h2 className="mt-3 text-lg font-semibold text-[#171717] group-hover:text-[#5b12c4]">{post.title}</h2>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-[#525252]">{post.description}</p>
            <p className="mt-4 text-xs text-[#a3a3a3]">{formatDate(post.date)} · {post.readingMinutes} min read</p>
          </Link>
        ))}
      </div>
    </ResourcesShell>
  )
}

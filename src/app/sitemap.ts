import type { MetadataRoute } from 'next'
import { publishedPosts } from '@/content/blog'
import { STORY_PROMPTS } from '@/content/prompt-library'
import { PRODUCT_UPDATES } from '@/content/updates'
import { LANDING_PAGES } from '@/content/landing-pages'

/** Public, indexable pages. The app is English-only, so only /en URLs are listed. */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://nucleusart.studio').replace(/\/+$/, '')
  const now = new Date()
  const page = (path: string, priority: number, changeFrequency: 'daily' | 'weekly' | 'monthly' = 'weekly', lastModified: Date = now) =>
    ({ url: `${baseUrl}/en${path}`, lastModified, changeFrequency, priority })

  return [
    page('', 1),
    page('/pricing', 0.9),
    page('/prompts', 0.9),
    page('/blog', 0.8),
    page('/updates', 0.6, 'weekly', new Date(`${PRODUCT_UPDATES[0]?.date ?? '2026-09-24'}T12:00:00Z`)),
    page('/help', 0.6, 'monthly'),
    page('/workflows', 0.5, 'monthly'),
    page('/affiliate', 0.5, 'monthly'),
    page('/terms', 0.2, 'monthly'),
    page('/privacy', 0.2, 'monthly'),
    page('/refund-policy', 0.2, 'monthly'),
    ...LANDING_PAGES.map((landing) => page(`/use-cases/${landing.slug}`, 0.9, 'monthly')),
    ...publishedPosts().map((post) => page(`/blog/${post.slug}`, 0.7, 'monthly', new Date(`${post.date}T12:00:00Z`))),
    ...STORY_PROMPTS.map((prompt) => page(`/prompts/${prompt.slug}`, 0.6, 'monthly')),
  ]
}

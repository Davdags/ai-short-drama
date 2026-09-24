import { BRAND_NAME } from '@/components/BrandWordmark'
import { SITE } from '@/lib/site-config'

/**
 * Who we are and what we sell, in schema.org form, on every page. Search engines and AI
 * assistants read this to describe NucleusArt accurately (name, category, prices, free tier).
 */
const BASE = 'https://nucleusart.studio'

export function SiteStructuredData() {
  const data = [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: BRAND_NAME,
      legalName: SITE.legalName,
      url: BASE,
      logo: `${BASE}/icon-512.png`,
      email: SITE.contactEmail,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: BRAND_NAME,
      url: `${BASE}/en`,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: BRAND_NAME,
      applicationCategory: 'MultimediaApplication',
      operatingSystem: 'Web',
      url: `${BASE}/en`,
      description: 'AI short drama and video ad studio: turn a story into a screenplay, consistent characters, a storyboard and vertical video.',
      offers: [
        { '@type': 'Offer', name: 'Free', price: '0', priceCurrency: 'USD', description: '150 credits on sign-up' },
        { '@type': 'Offer', name: 'Starter', price: '19', priceCurrency: 'USD', description: '500 credits per month' },
        { '@type': 'Offer', name: 'Pro', price: '49', priceCurrency: 'USD', description: '2,000 credits per month' },
        { '@type': 'Offer', name: 'Studio', price: '99', priceCurrency: 'USD', description: '5,000 credits per month' },
      ],
    },
  ]
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
}

import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { BRAND_NAME } from '@/components/BrandWordmark'

// The page itself is a client component, so its tab title and search description live here.
export const metadata: Metadata = {
  title: `Pricing | ${BRAND_NAME}`,
  description: 'Plans from $19 a month. Start free with 150 credits, pay in your own currency, and see the price of every step before you click.',
  alternates: { canonical: '/en/pricing' },
}

export default function Layout({ children }: { children: ReactNode }) {
  return children
}

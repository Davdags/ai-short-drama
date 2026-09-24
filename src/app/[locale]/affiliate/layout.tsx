import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { BRAND_NAME } from '@/components/BrandWordmark'

// The page itself is a client component, so its tab title and search description live here.
export const metadata: Metadata = {
  title: `Affiliate program | ${BRAND_NAME}`,
  description: 'Earn commission by recommending NucleusArt, the AI short drama studio.',
  alternates: { canonical: '/en/affiliate' },
}

export default function Layout({ children }: { children: ReactNode }) {
  return children
}

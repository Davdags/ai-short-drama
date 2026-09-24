import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { BRAND_NAME } from '@/components/BrandWordmark'

// The page itself is a client component, so its tab title and search description live here.
export const metadata: Metadata = {
  title: `Workflows | ${BRAND_NAME}`,
  description: 'Ready-made AI workflows for short dramas, video ads and more on NucleusArt.',
  alternates: { canonical: '/en/workflows' },
}

export default function Layout({ children }: { children: ReactNode }) {
  return children
}

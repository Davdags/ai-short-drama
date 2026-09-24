import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'

/** Internal component test pages: available in development only, 404 on the live site. */
export default function DevPagesLayout({ children }: { children: ReactNode }) {
  if (process.env.NODE_ENV === 'production') notFound()
  return children
}

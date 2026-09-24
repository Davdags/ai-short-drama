import type { Metadata } from 'next'
import { BRAND_NAME } from '@/components/BrandWordmark'
import { ResourcesShell, formatDate } from '@/components/resources/ResourcesShell'
import { PRODUCT_UPDATES } from '@/content/updates'

export const metadata: Metadata = {
  title: `Updates | ${BRAND_NAME}`,
  description: `What's new in ${BRAND_NAME}: new features, improvements and fixes.`,
  alternates: { canonical: '/en/updates' },
}

const TAG_STYLE = {
  New: 'bg-[#f3ecff] text-[#5b12c4]',
  Improved: 'bg-emerald-50 text-emerald-700',
  Fixed: 'bg-amber-50 text-amber-700',
} as const

export default function UpdatesPage() {
  return (
    <ResourcesShell active="/updates" title="Updates" intro="New features, improvements and fixes, newest first.">
      <ol className="relative space-y-10 border-l border-[#ececec] pl-6">
        {PRODUCT_UPDATES.map((update) => (
          <li key={`${update.date}-${update.title}`} className="relative">
            <span className="absolute -left-[31px] top-1.5 h-3 w-3 rounded-full border-2 border-white bg-[#8020fc]" aria-hidden />
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${TAG_STYLE[update.tag]}`}>{update.tag}</span>
              <time className="text-sm text-[#a3a3a3]" dateTime={update.date}>{formatDate(update.date)}</time>
            </div>
            <h2 className="mt-2 text-lg font-semibold text-[#171717]">{update.title}</h2>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed text-[#525252]">
              {update.items.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </li>
        ))}
      </ol>
    </ResourcesShell>
  )
}

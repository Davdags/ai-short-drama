import Link from 'next/link';
import { BRAND_NAME, BrandWordmark } from '@/components/BrandWordmark';
import { SITE } from '@/lib/site-config';

type FooterLink = { title: string; href: string };

/**
 * One grid for everything: the brand block and the four link columns share the same
 * left edge and top line on every screen size (on phones: brand on top, then two
 * even columns). Links that go nowhere yet ('#') are left out rather than shown dead.
 */

const COLUMNS: Array<{ heading: string; links: FooterLink[] }> = [
  {
    heading: 'Product',
    links: [
      { title: 'AI short drama maker', href: '/en/use-cases/ai-short-drama-maker' },
      { title: 'AI video ad generator', href: '/en/use-cases/ai-video-ad-generator' },
      { title: 'Nollywood-style dramas', href: '/en/use-cases/nollywood-ai-drama' },
      { title: 'AI storyboard generator', href: '/en/use-cases/ai-storyboard-generator' },
      { title: 'Prompt Library', href: '/en/prompts' },
      { title: 'Pricing', href: '/en/pricing' },
    ],
  },
  {
    heading: 'Models',
    links: [
      { title: 'Seedance 2.0', href: '/en/workspace' },
      { title: 'Kling 3.0', href: '/en/workspace' },
      { title: 'Wan 2.6', href: '/en/workspace' },
      { title: 'GPT Image 2', href: '/en/workspace' },
      { title: 'Nano Banana Pro', href: '/en/workspace' },
    ],
  },
  {
    heading: 'Resources',
    links: [
      { title: 'Blog', href: '/en/blog' },
      { title: 'Updates', href: '/en/updates' },
      { title: 'Help Centre', href: SITE.helpCenterUrl },
      { title: 'Community', href: SITE.communityUrl },
    ],
  },
  {
    heading: 'Company',
    links: [
      { title: 'Affiliates', href: '/en/affiliate' },
      { title: 'Contact', href: `mailto:${SITE.contactEmail}` },
      { title: 'Terms', href: SITE.termsUrl },
      { title: 'Privacy', href: SITE.privacyUrl },
      { title: 'Refund Policy', href: SITE.refundPolicyUrl },
    ],
  },
];

const SOCIALS: FooterLink[] = [
  { title: 'X / Twitter', href: SITE.social.x },
  { title: 'YouTube', href: SITE.social.youtube },
  { title: 'TikTok', href: SITE.social.tiktok },
  { title: 'Instagram', href: SITE.social.instagram },
  { title: 'Discord', href: SITE.social.discord },
];

const isLive = (link: FooterLink) => Boolean(link.href) && link.href !== '#';

const LINK_CLASS = 'text-sm text-[#525252] hover:text-[#8020fc] transition-colors';

export function Footer() {
  const socials = SOCIALS.filter(isLive);
  return (
    <footer className="border-t border-[#e5e5e5] bg-[#fafafa]">
      <div className="mx-auto max-w-7xl px-5 pb-10 pt-12 sm:px-6 lg:pt-16">
        <div className="grid grid-cols-2 gap-x-8 gap-y-10 md:grid-cols-4 lg:grid-cols-[1.6fr_repeat(4,1fr)]">
          {/* Brand: full width on phones and tablets, first column on desktop */}
          <div className="col-span-2 md:col-span-4 lg:col-span-1">
            <Link href="/en" className="inline-flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-small.png" alt={BRAND_NAME} className="h-8 w-8 object-contain" />
              <BrandWordmark className="text-xl font-bold tracking-tight text-[#171717]" />
            </Link>
            <p className="mt-4 text-lg font-extrabold uppercase tracking-tight text-[#171717]">
              Ideas into{' '}
              <span className="bg-gradient-to-r from-[#8020fc] to-[#5b3df5] bg-clip-text text-transparent">reality</span>
            </p>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-[#737373]">
              Turn any story into a cinematic short drama — script, characters, scenes, video and voice in one AI studio.
            </p>
            <Link
              href="/en/auth/signup"
              className="mt-5 inline-flex items-center rounded-full bg-[#171717] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#8020fc]"
            >
              Start free — 150 credits
            </Link>
          </div>

          {COLUMNS.map((column) => (
            <nav key={column.heading} aria-label={column.heading}>
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-[#a3a3a3]">{column.heading}</h3>
              <ul className="flex flex-col gap-3">
                {column.links.filter(isLive).map((link) => (
                  <li key={link.title}>
                    <Link href={link.href} className={LINK_CLASS}>{link.title}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-[#e5e5e5] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-xs text-[#737373]">© 2026 {BRAND_NAME}. All rights reserved.</p>
          <div className="flex flex-wrap gap-x-5 gap-y-1">
            {socials.length > 0
              ? socials.map((social) => (
                <Link key={social.title} href={social.href} className="text-xs font-medium text-[#525252] hover:text-[#8020fc]">{social.title}</Link>
              ))
              : <a href={`mailto:${SITE.contactEmail}`} className="text-xs font-medium text-[#525252] hover:text-[#8020fc]">{SITE.contactEmail}</a>}
          </div>
        </div>
      </div>
    </footer>
  );
}

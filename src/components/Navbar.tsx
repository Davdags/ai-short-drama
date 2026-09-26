'use client'

import { useState, useRef, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { AppIcon } from '@/components/ui/icons'
import { BRAND_NAME, BrandWordmark } from '@/components/BrandWordmark'
import { CreditsCard } from '@/components/account/CreditsCard'
import { SITE } from '@/lib/site-config'
import { GettingStartedPill } from '@/components/onboarding/GettingStarted'

const RESOURCES = [
  { href: '/blog', label: 'Blog', hint: 'Guides and story ideas' },
  { href: '/updates', label: 'Updates', hint: 'What’s new in NucleusArt' },
  { href: '/prompts', label: 'Prompt Library', hint: 'Ready-made stories to start from' },
  { href: '/help', label: 'Help Centre', hint: 'Answers about credits, plans and more' },
] as const

/** "Resources" dropdown: opens on hover (desktop) or click, closes on outside click. */
function ResourcesMenu({ linkClass }: { linkClass: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (event: MouseEvent) => { if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])
  return (
    <div ref={ref} className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} className={`flex items-center gap-1 ${linkClass}`}>
        Resources
        <AppIcon name="chevronDown" className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute left-1/2 top-full z-50 w-64 -translate-x-1/2 pt-3">
          <div className="rounded-xl border border-[#e5e5e5] bg-white p-2 shadow-lg">
            {RESOURCES.map((item) => (
              <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2 hover:bg-[#f5f5f5]">
                <span className="block text-sm font-medium text-[#171717]">{item.label}</span>
                <span className="block text-xs text-[#737373]">{item.hint}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const MENU_LINK_CLASS = 'flex items-center gap-3 px-4 py-2.5 text-sm text-[#525252] hover:bg-[#f5f5f5] transition-colors'

const NAV_STYLE = {
  bar: 'bg-white/80 border-[#e5e5e5]',
  link: 'text-sm text-[#525252] hover:text-[#171717] font-medium transition-colors',
  strong: 'text-[#171717]',
  skeleton: 'bg-[#f5f5f5]',
} as const

export default function Navbar() {
  const { data: session, status } = useSession()
  const t = useTranslations('nav')
  const tc = useTranslations('common')
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [userMenuOpen])

  const userName = session?.user?.name || 'User'
  const userInitial = userName.charAt(0).toUpperCase()

  return (
    <nav className={`sticky top-0 z-50 h-[64px] backdrop-blur-[10px] border-b ${NAV_STYLE.bar}`}>
      <div className="h-full px-4 sm:px-6 flex items-center justify-between md:grid md:grid-cols-3">
        {/* Left: Logo */}
        <div className="flex items-center min-w-0">
          <Link href={{ pathname: '/' as never }} className="flex items-center gap-2 min-w-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-small.png" alt={BRAND_NAME} className="h-8 sm:h-10 w-auto shrink-0" />
            <BrandWordmark className={`text-lg sm:text-xl font-bold tracking-tight whitespace-nowrap ${NAV_STYLE.strong}`} />
          </Link>
        </div>

        {/* Center: Nav links (desktop; on phones they live in the account menu) */}
        <div className="hidden md:flex items-center justify-center gap-8">
          {status !== 'loading' && session && (
            <>
              <Link href={{ pathname: '/workspace' }} className={NAV_STYLE.link}>
                {t('workspace')}
              </Link>
              <Link href={{ pathname: '/workspace/asset-hub' }} className={NAV_STYLE.link}>
                {t('assetHub')}
              </Link>
            </>
          )}
          <Link href={{ pathname: '/workflows' }} className={NAV_STYLE.link}>
            Workflows
          </Link>
          <Link href={{ pathname: '/pricing' }} className={NAV_STYLE.link}>
            Pricing
          </Link>
          <Link href={{ pathname: '/affiliate' }} className={`relative ${NAV_STYLE.link}`}>
            Affiliate
            <span className="absolute -top-1.5 -right-5 px-1.5 py-px text-white text-[8px] rounded bg-[#8020fc]">NEW</span>
          </Link>
          <ResourcesMenu linkClass={NAV_STYLE.link} />
        </div>

        {/* Right: User menu / Auth */}
        <div className="flex items-center justify-end gap-3 shrink-0">
          {status === 'loading' ? (
            <div className="flex items-center gap-3">
              <div className={`h-4 w-14 rounded animate-pulse ${NAV_STYLE.skeleton}`} />
              <div className={`h-8 w-8 rounded-full animate-pulse ${NAV_STYLE.skeleton}`} />
            </div>
          ) : session ? (
            <>
            <GettingStartedPill />
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#8020fc] to-[#5b3df5] text-white flex items-center justify-center text-sm font-semibold">
                  {userInitial}
                </div>
                <span className={`text-sm font-medium hidden sm:inline ${NAV_STYLE.strong}`}>{userName}</span>
                <AppIcon name="chevronDown" className={`w-3 h-3 text-[#737373] transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-[#e5e5e5] rounded-xl shadow-lg py-2 z-50">
                  <div className="px-4 py-3 border-b border-[#e5e5e5]">
                    <div className="text-sm font-semibold text-[#171717]">{userName}</div>
                    <div className="text-xs text-[#737373] mt-0.5">Personal Account</div>
                  </div>
                  <CreditsCard onNavigate={() => setUserMenuOpen(false)} onAdminDetected={setIsAdmin} />
                  <div className="py-1 border-b border-[#e5e5e5] md:hidden">
                    <Link href={{ pathname: '/workspace' }} className={MENU_LINK_CLASS} onClick={() => setUserMenuOpen(false)}>
                      {t('workspace')}
                    </Link>
                    <Link href={{ pathname: '/workspace/asset-hub' }} className={MENU_LINK_CLASS} onClick={() => setUserMenuOpen(false)}>
                      {t('assetHub')}
                    </Link>
                    <Link href={{ pathname: '/workflows' }} className={MENU_LINK_CLASS} onClick={() => setUserMenuOpen(false)}>
                      Workflows
                    </Link>
                    <Link href={{ pathname: '/pricing' }} className={MENU_LINK_CLASS} onClick={() => setUserMenuOpen(false)}>
                      Pricing
                    </Link>
                    {RESOURCES.map((item) => (
                      <Link key={item.href} href={item.href} className={MENU_LINK_CLASS} onClick={() => setUserMenuOpen(false)}>
                        {item.label}
                      </Link>
                    ))}
                  </div>
                  <div className="py-1">
                    {isAdmin && (
                      <Link
                        href={{ pathname: '/admin' }}
                        className={MENU_LINK_CLASS}
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <AppIcon name="statsBar" className="w-4 h-4" />
                        Admin
                      </Link>
                    )}
                    <Link
                      href={{ pathname: '/account' }}
                      className={MENU_LINK_CLASS}
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <AppIcon name="receipt" className="w-4 h-4" />
                      Account & credits
                    </Link>
                    <Link
                      href={{ pathname: '/profile' }}
                      className={MENU_LINK_CLASS}
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <AppIcon name="settingsHex" className="w-4 h-4" />
                      Model preferences
                    </Link>
                    <Link
                      href={{ pathname: '/affiliate' }}
                      className={MENU_LINK_CLASS}
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <AppIcon name="coins" className="w-4 h-4" />
                      Affiliate program
                      <span className="ml-auto rounded bg-[#8020fc] px-1.5 py-px text-[9px] font-semibold text-white">New</span>
                    </Link>
                    <a
                      href={SITE.communityUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={MENU_LINK_CLASS}
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <AppIcon name="usersRound" className="w-4 h-4" />
                      Join community
                    </a>
                  </div>
                  <div className="border-t border-[#e5e5e5] py-1">
                    <button
                      onClick={() => signOut({ callbackUrl: '/' })}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-[#f5f5f5] transition-colors cursor-pointer"
                    >
                      <AppIcon name="logout" className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
            </>
          ) : (
            <div className="flex items-center gap-3 sm:gap-4">
              <Link href={{ pathname: '/auth/signin' }} className={NAV_STYLE.link}>
                {t('signin')}
              </Link>
              <Link
                href={{ pathname: '/auth/signup' }}
                className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-[#8020fc] to-[#5b3df5] text-white rounded-md hover:brightness-110 transition-all"
              >
                {t('signup')}
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}

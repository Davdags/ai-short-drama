'use client'
import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import Navbar from '@/components/Navbar'
import AppSidebar from '@/components/AppSidebar'
import ApiConfigTab from './components/ApiConfigTab'
import { EmailPreferencesCard } from './components/EmailPreferencesCard'
import { useRouter } from '@/i18n/navigation'

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const tc = useTranslations('common')

  useEffect(() => {
    if (status === 'loading') return
    if (!session) { router.push({ pathname: '/auth/signin' }); return }
  }, [router, session, status])

  if (status === 'loading' || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa]">
        <div className="text-[#525252]">{tc('loading')}</div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-[#fafafa] overflow-hidden">
      <Navbar />
      <div className="flex flex-1 min-h-0">
        <AppSidebar />
        <main className="flex-1 overflow-y-auto pb-24 md:pb-0">
          {/* Settings header */}
          <div className="border-b border-[#e5e5e5] bg-white px-4 py-5 sm:px-8 sm:py-6">
            <h1 className="text-2xl font-semibold text-[#171717]">Model preferences</h1>
            <p className="text-sm text-[#525252] mt-1">Choose the default AI models for your projects. You can still switch models inside any project.</p>
          </div>

          {/* Settings Content */}
          <div className="px-3 py-4 sm:px-8 sm:py-6 space-y-4">
            <div className="bg-white border border-[#e5e5e5] rounded-xl p-4 sm:p-6">
              <ApiConfigTab />
            </div>
            <div className="bg-white border border-[#e5e5e5] rounded-xl p-4 sm:p-6">
              <EmailPreferencesCard />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

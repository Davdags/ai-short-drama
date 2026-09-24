'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from '@/i18n/navigation'
import { AppIcon } from '@/components/ui/icons'
import { NOTIFY_EVENT, type NotifyDetail, type NotifyKind } from '@/lib/ui/notify'

/**
 * Top-right notification cards for everything raised through notify() / notifyAlert().
 * Replaces the browser's alert() boxes, which blocked the page and looked broken.
 */

const MAX_VISIBLE = 4

const STYLE: Record<NotifyKind, { icon: 'check' | 'alert' | 'info'; ring: string; iconColor: string }> = {
  success: { icon: 'check', ring: 'border-emerald-200', iconColor: 'text-emerald-600 bg-emerald-50' },
  error: { icon: 'alert', ring: 'border-red-200', iconColor: 'text-red-600 bg-red-50' },
  warning: { icon: 'alert', ring: 'border-amber-200', iconColor: 'text-amber-600 bg-amber-50' },
  info: { icon: 'info', ring: 'border-[#e5e5e5]', iconColor: 'text-[#8020fc] bg-[#f3ecff]' },
}

export function NotificationCenter() {
  const [items, setItems] = useState<NotifyDetail[]>([])
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>())

  const dismiss = useCallback((id: string) => {
    setItems((current) => current.filter((item) => item.id !== id))
    const timer = timers.current.get(id)
    if (timer) clearTimeout(timer)
    timers.current.delete(id)
  }, [])

  useEffect(() => {
    const onNotify = (event: Event) => {
      const detail = (event as CustomEvent<NotifyDetail>).detail
      if (!detail?.message) return
      setItems((current) => {
        // The same message fired twice in a row (double click) shows once.
        if (current.some((item) => item.message === detail.message && item.kind === detail.kind)) return current
        return [...current, detail].slice(-MAX_VISIBLE)
      })
      if (detail.duration > 0) {
        timers.current.set(detail.id, setTimeout(() => dismiss(detail.id), detail.duration))
      }
    }
    window.addEventListener(NOTIFY_EVENT, onNotify)
    const pending = timers.current
    return () => {
      window.removeEventListener(NOTIFY_EVENT, onNotify)
      pending.forEach((timer) => clearTimeout(timer))
    }
  }, [dismiss])

  if (items.length === 0) return null

  return (
    <div className="pointer-events-none fixed right-4 top-20 z-[250] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2">
      {items.map((item) => {
        const style = STYLE[item.kind]
        return (
          <div
            key={item.id}
            role={item.kind === 'error' ? 'alert' : 'status'}
            className={`pointer-events-auto flex items-start gap-3 rounded-xl border ${style.ring} bg-white p-3.5 shadow-lg animate-[fadeIn_150ms_ease-out]`}
          >
            <span className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full ${style.iconColor}`}>
              <AppIcon name={style.icon} className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              {item.title && <p className="text-sm font-semibold text-[#171717]">{item.title}</p>}
              <p className="whitespace-pre-line break-words text-sm text-[#404040]">{item.message}</p>
              {item.action && (
                item.action.href ? (
                  <Link
                    href={item.action.href.replace(/^\/en(?=\/|$)/, '') || '/'}
                    onClick={() => dismiss(item.id)}
                    className="mt-2 inline-block text-sm font-semibold text-[#8020fc] hover:underline"
                  >
                    {item.action.label}
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => { item.action?.onClick?.(); dismiss(item.id) }}
                    className="mt-2 text-sm font-semibold text-[#8020fc] hover:underline"
                  >
                    {item.action.label}
                  </button>
                )
              )}
            </div>
            <button
              type="button"
              aria-label="Close"
              onClick={() => dismiss(item.id)}
              className="flex-shrink-0 rounded-md p-1 text-[#a3a3a3] hover:bg-[#f5f5f5] hover:text-[#525252]"
            >
              <AppIcon name="close" className="h-4 w-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}

'use client'

import { useState } from 'react'
import { shouldShowError } from '@/lib/error-utils'
import { resolveTaskPresentationState } from '@/lib/task/presentation'
import { getErrorMessage } from '../promptStageRuntime.utils'
import { notifyAlert } from '@/lib/ui/notify'

interface UsePromptAppendFlowParams {
  onAppendContent?: (content: string) => Promise<void>
  t: (key: string, values?: Record<string, string | number>) => string
}

export function usePromptAppendFlow({
  onAppendContent,
  t,
}: UsePromptAppendFlowParams) {
  const [appendContent, setAppendContent] = useState('')
  const [isAppending, setIsAppending] = useState(false)

  const appendTaskRunningState = isAppending
    ? resolveTaskPresentationState({
      phase: 'processing',
      intent: 'generate',
      resource: 'text',
      hasOutput: false,
    })
    : null

  const handleAppendSubmit = async () => {
    if (!onAppendContent) return
    if (!appendContent.trim()) {
      notifyAlert(t('prompts.enterContinuation'))
      return
    }

    setIsAppending(true)
    try {
      await onAppendContent(appendContent.trim())
      setAppendContent('')
      notifyAlert(t('prompts.appendSuccess'))
    } catch (error: unknown) {
      if (shouldShowError(error)) {
        notifyAlert(t('prompts.appendFailed', { error: getErrorMessage(error, t('common.unknownError')) }))
      }
    } finally {
      setIsAppending(false)
    }
  }

  return {
    appendContent,
    setAppendContent,
    isAppending,
    appendTaskRunningState,
    handleAppendSubmit,
  }
}

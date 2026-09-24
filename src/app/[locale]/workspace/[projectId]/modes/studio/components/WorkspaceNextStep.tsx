'use client'

import { useParams } from 'next/navigation'
import { AppIcon } from '@/components/ui/icons'
import { CreditCost, type QuoteItem } from '@/components/credits/CreditCost'
import type { NextAction, WorkspaceProgress, WorkspaceStageId } from '@/lib/studio/workspace-progress'
import { useWorkspaceStageRuntime } from '../WorkspaceStageRuntimeContext'

/**
 * Top of every stage: the four steps (with what each still needs) and one clear next
 * action with its price. Customers kept asking "what do I do now?" — this answers it.
 */

function StepBar({ progress, currentStage, onGo }: {
  progress: WorkspaceProgress
  currentStage: string
  onGo: (stage: WorkspaceStageId) => void
}) {
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-2">
      {progress.steps.map((step, index) => {
        const viewing = step.id === currentStage || (step.id === 'script' && currentStage === 'assets')
        const tone = step.state === 'done'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : step.state === 'current'
            ? 'border-[#8020fc] bg-[#f3ecff] text-[#5b12c4]'
            : 'border-[#e5e5e5] bg-white text-[#737373]'
        return (
          <li key={step.id} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onGo(step.id)}
              aria-current={viewing ? 'step' : undefined}
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors hover:brightness-95 ${tone} ${viewing ? 'ring-2 ring-offset-1 ring-[#171717]/10' : ''}`}
            >
              <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold ${
                step.state === 'done' ? 'bg-emerald-500 text-white' : step.state === 'current' ? 'bg-[#8020fc] text-white' : 'bg-[#f5f5f5] text-[#737373]'
              }`}>
                {step.state === 'done' ? <AppIcon name="check" className="h-3 w-3" /> : step.number}
              </span>
              <span>{step.label}</span>
              {step.detail && <span className="hidden opacity-75 sm:inline">· {step.detail}</span>}
            </button>
            {index < progress.steps.length - 1 && <span className="hidden h-px w-4 bg-[#e5e5e5] sm:block" aria-hidden />}
          </li>
        )
      })}
    </ol>
  )
}

/** The price shown on the next-step button, from the project's configured image model. */
function costItemsFor(next: NextAction, projectId: string): QuoteItem[] | null {
  if (!projectId || !next.remaining) return null
  if (next.kind === 'create-cast') {
    return [{ apiType: 'image', model: '', quantity: next.remaining, usesProjectModel: true, projectId, projectModelField: 'characterModel' }]
  }
  if (next.kind === 'create-scenes') {
    return [{ apiType: 'image', model: '', quantity: next.remaining, usesProjectModel: true, projectId, projectModelField: 'storyboardModel' }]
  }
  return null
}

export function WorkspaceNextStep({ progress, currentStage, busy }: {
  progress: WorkspaceProgress
  currentStage: string
  busy?: boolean
}) {
  const runtime = useWorkspaceStageRuntime()
  const projectId = useParams<{ projectId?: string }>()?.projectId ?? ''
  const { next } = progress

  const go = (stage: WorkspaceStageId) => runtime.onStageChange(stage)

  const act = () => {
    switch (next.kind) {
      case 'run-script':
        if (currentStage === 'config') return void runtime.onRunStoryToScript()
        return go('config')
      case 'create-cast':
        if (currentStage !== 'script') go('script')
        return runtime.onOpenAssetLibrary()
      case 'run-storyboard':
        return void runtime.onRunScriptToStoryboard()
      default:
        return go(next.stage)
    }
  }

  // Standing on the step that needs doing, with its own big button right below: just say so.
  const onItsStage = next.stage === currentStage && (next.kind === 'write-story' || next.kind === 'create-scenes' || next.kind === 'create-videos' || next.kind === 'export')
  const costItems = costItemsFor(next, projectId)

  return (
    <div className="mb-6 space-y-3">
      <StepBar progress={progress} currentStage={currentStage} onGo={go} />
      <div className="flex flex-col gap-3 rounded-2xl border border-[#ece3ff] bg-gradient-to-r from-[#faf7ff] to-white p-4 sm:flex-row sm:items-center">
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#8020fc] text-white">
          <AppIcon name={next.kind === 'export' ? 'check' : 'arrowRight'} className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#8020fc]">
            {next.kind === 'export' ? 'Done' : 'Next step'}
          </p>
          <p className="text-sm font-semibold text-[#171717]">{next.title}</p>
          <p className="text-sm text-[#525252]">
            {next.description}
            {onItsStage && next.kind !== 'write-story' && ' Use the button below.'}
          </p>
        </div>
        {!onItsStage && (
          <button
            type="button"
            onClick={act}
            disabled={busy}
            className="glass-btn-base glass-btn-primary flex flex-shrink-0 items-center justify-center gap-2 px-4 py-2 text-sm disabled:opacity-60"
          >
            {busy ? 'Working…' : next.button}
            {!busy && costItems && <CreditCost items={costItems} prefix="· " className="!text-white/85" />}
          </button>
        )}
      </div>
    </div>
  )
}

/** Shown instead of an empty stage: why it is empty and a button to where the work is. */
export function StageBlockedNotice({ message, button, goTo }: { message: string; button: string; goTo: WorkspaceStageId }) {
  const runtime = useWorkspaceStageRuntime()
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[#d4d4d4] bg-[#fafafa] px-6 py-14 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#8020fc] shadow-sm">
        <AppIcon name="info" className="h-5 w-5" />
      </span>
      <p className="max-w-md text-sm text-[#525252]">{message}</p>
      <button
        type="button"
        onClick={() => runtime.onStageChange(goTo)}
        className="glass-btn-base glass-btn-primary px-4 py-2 text-sm"
      >
        {button}
      </button>
    </div>
  )
}

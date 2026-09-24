/**
 * Where a project stands and what the customer should do next.
 *
 * The workspace used to let people wander into any stage with no hint of order: they
 * reached "Video" before any scene had a picture and met greyed-out buttons with no reason.
 * This turns the project's real data into four steps and one clear next action.
 * Pure and client-safe, so the same answer drives the step bar, the next-step card,
 * empty states and button explanations.
 */

export type WorkspaceStageId = 'config' | 'script' | 'storyboard' | 'videos'
export type StepState = 'done' | 'current' | 'todo'

export interface WorkspaceProgressInput {
  storyText: string | null | undefined
  clipCount: number
  characters: Array<{ name: string; hasImage: boolean }>
  locations: Array<{ name: string; hasImage: boolean }>
  panels: Array<{ hasImage: boolean; hasVideo: boolean }>
  /** A writing run is in progress (story → script or script → storyboard). */
  busy?: boolean
}

export interface WorkspaceStep {
  id: WorkspaceStageId
  number: number
  label: string
  state: StepState
  /** Short progress note, e.g. "2 of 3 cast pictures". */
  detail?: string
}

export type NextActionKind =
  | 'write-story'
  | 'run-script'
  | 'create-cast'
  | 'run-storyboard'
  | 'create-scenes'
  | 'create-videos'
  | 'export'

export interface NextAction {
  kind: NextActionKind
  stage: WorkspaceStageId
  title: string
  description: string
  button: string
  /** How many images/clips this step still needs, for pricing the button. */
  remaining?: number
}

export interface WorkspaceProgress {
  steps: WorkspaceStep[]
  next: NextAction
  counts: {
    castTotal: number
    castWithImage: number
    panels: number
    panelsWithImage: number
    panelsWithVideo: number
  }
}

function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`
}

export function computeWorkspaceProgress(input: WorkspaceProgressInput): WorkspaceProgress {
  const hasStory = Boolean(input.storyText?.trim())
  const hasScript = input.clipCount > 0
  const cast = [...input.characters, ...input.locations]
  const castWithImage = cast.filter((item) => item.hasImage).length
  const castMissing = cast.length - castWithImage
  const panels = input.panels.length
  const panelsWithImage = input.panels.filter((panel) => panel.hasImage).length
  const panelsWithVideo = input.panels.filter((panel) => panel.hasVideo).length

  const counts = { castTotal: cast.length, castWithImage, panels, panelsWithImage, panelsWithVideo }

  let next: NextAction
  if (!hasStory) {
    next = {
      kind: 'write-story', stage: 'config',
      title: 'Write your story',
      description: 'Paste or type a story, pick a look, then press Start Creating. A few paragraphs is enough.',
      button: 'Write story',
    }
  } else if (!hasScript) {
    next = {
      kind: 'run-script', stage: 'config',
      title: 'Turn your story into a script',
      description: 'We write the screenplay and find your characters and locations.',
      button: 'Create script',
    }
  } else if (castMissing > 0) {
    next = {
      kind: 'create-cast', stage: 'script',
      title: 'Create pictures of your cast',
      description: `${plural(castMissing, 'character or location', 'characters and locations')} still need a picture. Every scene uses them, so faces and places stay the same from shot to shot.`,
      button: 'Create cast pictures',
      remaining: castMissing,
    }
  } else if (panels === 0) {
    next = {
      kind: 'run-storyboard', stage: 'script',
      title: 'Build the storyboard',
      description: 'We split your script into shots with camera directions.',
      button: 'Build storyboard',
    }
  } else if (panelsWithImage < panels) {
    next = {
      kind: 'create-scenes', stage: 'storyboard',
      title: 'Create your scene pictures',
      description: `${plural(panels - panelsWithImage, 'shot')} still need a picture. Each one becomes the first frame of its video clip.`,
      button: 'Create scene pictures',
      remaining: panels - panelsWithImage,
    }
  } else if (panelsWithVideo < panels) {
    next = {
      kind: 'create-videos', stage: 'videos',
      title: 'Bring your scenes to life',
      description: `${plural(panels - panelsWithVideo, 'shot')} ready to turn into video.`,
      button: 'Make videos',
      remaining: panels - panelsWithVideo,
    }
  } else {
    next = {
      kind: 'export', stage: 'videos',
      title: 'Your drama is ready',
      description: 'Every shot has its video. Export the full film to download or share it.',
      button: 'Export film',
    }
  }

  const doneStory = hasStory && hasScript
  const doneScript = doneStory && castMissing === 0 && panels > 0
  const doneStoryboard = doneScript && panelsWithImage === panels
  const doneVideo = doneStoryboard && panelsWithVideo === panels

  const stateFor = (id: WorkspaceStageId, done: boolean): StepState =>
    done ? 'done' : next.stage === id ? 'current' : 'todo'

  const steps: WorkspaceStep[] = [
    { id: 'config', number: 1, label: 'Story', state: stateFor('config', doneStory) },
    {
      id: 'script', number: 2, label: 'Script & cast', state: stateFor('script', doneScript),
      detail: hasScript && cast.length > 0 ? `${castWithImage} of ${plural(cast.length, 'cast picture')}` : undefined,
    },
    {
      id: 'storyboard', number: 3, label: 'Storyboard', state: stateFor('storyboard', doneStoryboard),
      detail: panels > 0 ? `${panelsWithImage} of ${plural(panels, 'scene')}` : undefined,
    },
    {
      id: 'videos', number: 4, label: 'Video', state: stateFor('videos', doneVideo),
      detail: panelsWithImage > 0 ? `${panelsWithVideo} of ${plural(panels, 'clip')}` : undefined,
    },
  ]

  return { steps, next, counts }
}

/** Why a stage has nothing to show yet, and where to go instead. Null when the stage is ready. */
export function stageBlocker(stage: WorkspaceStageId, progress: WorkspaceProgress): { message: string; goTo: WorkspaceStageId; button: string } | null {
  const { counts } = progress
  if (stage === 'storyboard' && counts.panels === 0) {
    return { message: 'Your storyboard appears here once your script and cast are ready.', goTo: progress.next.stage, button: progress.next.button }
  }
  if (stage === 'videos' && counts.panelsWithImage === 0) {
    return { message: 'Videos start from scene pictures. Create at least one scene picture in the storyboard first.', goTo: counts.panels > 0 ? 'storyboard' : progress.next.stage, button: counts.panels > 0 ? 'Go to storyboard' : progress.next.button }
  }
  return null
}

import { prisma } from '@/lib/prisma'

/**
 * The getting-started checklist for new accounts. Every item ticks itself off from what
 * the customer has actually done — nothing to tick by hand — and links straight to where
 * the next one happens (their most recent project).
 */

export type GettingStartedStepId = 'verify' | 'story' | 'script' | 'cast' | 'scene' | 'video'

export interface GettingStartedStep {
  id: GettingStartedStepId
  label: string
  hint: string
  done: boolean
  href: string
}

export interface GettingStartedState {
  steps: GettingStartedStep[]
  completed: number
  total: number
}

const ofUser = (userId: string) => ({ studioProject: { project: { userId } } })

export async function getGettingStarted(userId: string): Promise<GettingStartedState> {
  const [user, story, script, cast, scene, video, latest] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { emailVerified: true } }),
    prisma.studioEpisode.findFirst({ where: { ...ofUser(userId), novelText: { not: null } }, select: { novelText: true } }),
    prisma.studioClip.findFirst({ where: { episode: ofUser(userId) }, select: { id: true } }),
    prisma.characterAppearance.findFirst({ where: { imageUrl: { not: null }, character: ofUser(userId) }, select: { id: true } }),
    prisma.studioPanel.findFirst({ where: { imageUrl: { not: null }, storyboard: { episode: ofUser(userId) } }, select: { id: true } }),
    prisma.studioPanel.findFirst({ where: { videoUrl: { not: null }, storyboard: { episode: ofUser(userId) } }, select: { id: true } }),
    prisma.project.findFirst({ where: { userId }, orderBy: { updatedAt: 'desc' }, select: { id: true } }),
  ])

  const project = latest ? `/workspace/${latest.id}` : null
  const at = (stage: string, fallback: string) => (project ? `${project}?stage=${stage}` : fallback)

  const steps: GettingStartedStep[] = [
    {
      id: 'verify', label: 'Verify your email', hint: 'Unlocks your 150 free credits.',
      done: Boolean(user?.emailVerified), href: '/account',
    },
    {
      id: 'story', label: 'Write your first story', hint: 'Type a few paragraphs, or start from the Prompt Library.',
      done: Boolean(story?.novelText?.trim()), href: project ? at('config', '/workspace') : '/prompts',
    },
    {
      id: 'script', label: 'Turn it into a script', hint: 'We write the screenplay and find your cast.',
      done: Boolean(script), href: at('config', '/workspace'),
    },
    {
      id: 'cast', label: 'Create your cast', hint: 'A picture of each character keeps faces the same in every shot.',
      done: Boolean(cast), href: at('script', '/workspace'),
    },
    {
      id: 'scene', label: 'Generate your first scene', hint: 'Your storyboard comes to life, shot by shot.',
      done: Boolean(scene), href: at('storyboard', '/workspace'),
    },
    {
      id: 'video', label: 'Make it move', hint: 'Turn a scene into video — available on paid plans.',
      done: Boolean(video), href: scene ? at('videos', '/pricing') : '/pricing',
    },
  ]

  return { steps, completed: steps.filter((step) => step.done).length, total: steps.length }
}

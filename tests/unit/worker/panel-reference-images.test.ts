import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/workers/utils', () => ({
  toSignedUrlIfCos: (key: string | null | undefined) => (key ? `signed:${key}` : null),
}))

import {
  collectLabeledPanelReferenceImages,
  findCharacterByName,
  matchesLocationName,
  normalizeAssetName,
  sameAssetName,
} from '@/lib/workers/handlers/image-task-handler-shared'

const projectData = {
  characters: [
    { name: 'Amara', appearances: [{ imageUrls: JSON.stringify(['images/amara.jpg']), selectedIndex: null, imageUrl: 'images/amara.jpg', changeReason: 'initial' }] },
    { name: 'Chidi Okafor', appearances: [{ imageUrls: JSON.stringify(['images/chidi.jpg']), selectedIndex: 0, imageUrl: 'images/chidi.jpg', changeReason: 'initial' }] },
  ],
  locations: [
    { name: "Chidi Okafor's Executive Office", images: [{ imageUrl: 'images/office.jpg', isSelected: false }, { imageUrl: null, isSelected: true }] },
  ],
}

describe('panel reference pictures', () => {
  it('treats curly and straight apostrophes as the same name', () => {
    expect(normalizeAssetName('  Chidi Okafor\u2019s   Executive Office ')).toBe("chidi okafor's executive office")
    expect(sameAssetName("Chidi Okafor\u2019s Executive Office", "Chidi Okafor's Executive Office")).toBe(true)
    expect(findCharacterByName(projectData.characters, 'chidi okafor')?.name).toBe('Chidi Okafor')
  })

  it('matches a location name that has a description added after it', () => {
    expect(matchesLocationName('Rooftop', 'Rooftop — windy, at dusk')).toBe(true)
    expect(matchesLocationName('Rooftop', 'rooftop')).toBe(true)
    expect(matchesLocationName('Roof', 'Rooftop bar')).toBe(false)
  })

  it('labels each picture with the character or location it shows, in order', async () => {
    const refs = await collectLabeledPanelReferenceImages(projectData as never, {
      sketchImageUrl: null,
      characters: JSON.stringify([{ name: 'Chidi Okafor' }, { name: 'Amara' }]),
      location: 'Chidi Okafor\u2019s Executive Office \u2014 corner office with floor-to-ceiling windows',
    } as never)

    expect(refs).toEqual([
      { url: 'signed:images/chidi.jpg', label: 'character Chidi Okafor', kind: 'character', name: 'Chidi Okafor' },
      { url: 'signed:images/amara.jpg', label: 'character Amara', kind: 'character', name: 'Amara' },
      // The selected slot has no picture yet, so the one that exists is used.
      { url: 'signed:images/office.jpg', label: "location Chidi Okafor's Executive Office", kind: 'location', name: "Chidi Okafor's Executive Office" },
    ])
  })
})

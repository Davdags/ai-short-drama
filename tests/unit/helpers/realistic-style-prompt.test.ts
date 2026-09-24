import { describe, expect, it } from 'vitest'
import { addCharacterPromptSuffix, getArtStylePrompt, removeCharacterPromptSuffix } from '@/lib/constants'

/**
 * Customers picking "Realistic" got painted/animated pictures: the old style text never said
 * "photograph" or ruled out illustration, and the character-sheet layout was sent in Chinese.
 */
describe('realistic style and character sheet prompts', () => {
  it('asks for a photograph and rules out drawn or rendered looks', () => {
    const prompt = getArtStylePrompt('realistic', 'en')
    expect(prompt).toMatch(/photograph/i)
    expect(prompt).toMatch(/not an illustration/i)
    expect(prompt).toMatch(/not a 3D render/i)
  })

  it('sends the character sheet layout in English', () => {
    const prompt = addCharacterPromptSuffix('A woman in a burgundy suit')
    expect(prompt).toContain('Character reference sheet')
    expect(prompt).not.toMatch(/[一-鿿]/)
  })

  it('still strips the old Chinese layout from prompts saved before the change', () => {
    const legacy = 'A woman in a burgundy suit，角色设定图，画面分为左右两个区域：【左侧区域】占约1/3宽度，是角色的正面特写（如果是人类则展示完整正脸，如果是动物/生物则展示最具辨识度的正面形态）；【右侧区域】占约2/3宽度，是角色三视图横向排列（从左到右依次为：正面全身、侧面全身、背面全身），三视图高度一致。纯白色背景，无其他元素。'
    expect(removeCharacterPromptSuffix(legacy)).toBe('A woman in a burgundy suit')
    expect(addCharacterPromptSuffix(legacy)).not.toMatch(/[一-鿿]/)
  })
})

import { describe, expect, it } from 'vitest'
import { FRIENDLY_ERROR_FALLBACK, humanizeErrorMessage } from '@/lib/errors/humanize'

describe('humanizeErrorMessage', () => {
  it('hides the raw config error a new customer saw in an alert box', () => {
    expect(humanizeErrorMessage('PROVIDER_BASE_URL_MISSING: evolink (llm)')).toBe(FRIENDLY_ERROR_FALLBACK)
  })

  it('hides a bare machine code', () => {
    expect(humanizeErrorMessage('EVOLINK_IMAGE_TASK_ID_MISSING')).toBe(FRIENDLY_ERROR_FALLBACK)
  })

  it('hides a code followed by a raw provider payload', () => {
    expect(humanizeErrorMessage('EVOLINK_IMAGE_SUBMIT_FAILED(500): {"error":"upstream"}')).toBe(FRIENDLY_ERROR_FALLBACK)
  })

  it('hides low-level network and runtime errors', () => {
    expect(humanizeErrorMessage('connect ECONNREFUSED 127.0.0.1:6379')).toBe(FRIENDLY_ERROR_FALLBACK)
    expect(humanizeErrorMessage("Cannot read properties of undefined (reading 'id')")).toBe(FRIENDLY_ERROR_FALLBACK)
  })

  it('keeps messages already written for people', () => {
    expect(humanizeErrorMessage('Needs 50 credits, you have 25.')).toBe('Needs 50 credits, you have 25.')
    expect(humanizeErrorMessage('Voice design failed. Please try again.')).toBe('Voice design failed. Please try again.')
  })

  it('keeps the human sentence after a code prefix', () => {
    expect(humanizeErrorMessage('ANALYSIS_MODEL_NOT_CONFIGURED: Choose a story model in Settings first.'))
      .toBe('Choose a story model in Settings first.')
  })

  it('uses the caller fallback when given one', () => {
    expect(humanizeErrorMessage('PROVIDER_BASE_URL_MISSING: evolink', 'Image generation failed.')).toBe('Image generation failed.')
    expect(humanizeErrorMessage('', 'Image generation failed.')).toBe('Image generation failed.')
    expect(humanizeErrorMessage(null)).toBe(FRIENDLY_ERROR_FALLBACK)
  })
})

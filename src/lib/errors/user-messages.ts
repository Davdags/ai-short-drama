import type { UnifiedErrorCode } from './codes'

/** Customer-facing error messages (NucleusArt is English-only). */
export const USER_ERROR_MESSAGES: Record<UnifiedErrorCode, string> = {
  UNAUTHORIZED: 'Please sign in and try again.',
  FORBIDDEN: "You don't have permission to do that.",
  NOT_FOUND: "We couldn't find what you were looking for.",
  INVALID_PARAMS: 'Something in the request is not valid. Please check and try again.',
  MISSING_CONFIG: 'This feature is not available right now. Please contact support.',
  CONFLICT: 'This item changed in the meantime. Please refresh and try again.',
  TASK_NOT_READY: 'Still working on it — please wait a moment.',
  NO_RESULT: 'The task finished but produced no result. Please try again.',
  RATE_LIMIT: "We're experiencing high demand right now. Please try again in a few minutes.",
  MODEL_NOT_OPEN: 'This model is not available right now. Please choose another model.',
  MODEL_NOT_REGISTERED: 'This model is not available. Please choose another model in Model preferences.',
  MODEL_NOT_CONFIGURED: 'No model is selected for this step. Please choose one in Model preferences.',
  QUOTA_EXCEEDED: "We're experiencing high demand right now. Please try again shortly.",
  EXTERNAL_ERROR: 'The AI service is temporarily unavailable. Please try again shortly.',
  NETWORK_ERROR: 'Network problem. Please check your connection and try again.',
  EMPTY_RESPONSE: 'The AI returned an empty result. Please try again.',
  INSUFFICIENT_BALANCE: "You don't have enough credits for this. Upgrade your plan or top up to continue.",
  SENSITIVE_CONTENT: 'This content may break our content rules. Please adjust it and try again.',
  GENERATION_TIMEOUT: 'Generation took too long. Please try again.',
  VIDEO_API_FORMAT_UNSUPPORTED: "This video format isn't supported yet.",
  GENERATION_FAILED: 'Generation failed. Please try again.',
  WATCHDOG_TIMEOUT: 'This task took too long and was stopped. Please try again.',
  WORKER_EXECUTION_ERROR: 'The task failed. Please try again.',
  INTERNAL_ERROR: 'Something went wrong on our side. Please try again.',
}

/** @deprecated kept for existing imports; messages are English. */
export const USER_ERROR_MESSAGES_ZH = USER_ERROR_MESSAGES

export function getUserMessageByCode(code: UnifiedErrorCode) {
  return USER_ERROR_MESSAGES[code]
}

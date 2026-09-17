import { personalAiUrl } from './personal-ai.mjs'
export const personalAiEndpoint = personalAiUrl(import.meta.env.PROD
  ? import.meta.env.PUBLIC_PERSONAL_AI_URL
  : (import.meta.env.PUBLIC_PERSONAL_AI_DEV_URL || import.meta.env.PUBLIC_PERSONAL_AI_URL), import.meta.env.PROD)

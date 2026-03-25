/**
 * AI Configuration File
 * =====================
 * Using Lovable AI Gateway — no API key needed from users!
 * The LOVABLE_API_KEY is auto-provisioned.
 */

export const AI_CONFIG = {
  // Lovable AI Gateway (OpenAI-compatible)
  endpoint: 'https://ai.gateway.lovable.dev/v1/chat/completions',

  // Default model — change this anytime!
  // Available models:
  //   - "google/gemini-3-flash-preview"    (fast, balanced — DEFAULT)
  //   - "google/gemini-2.5-flash"          (good multimodal + reasoning)
  //   - "google/gemini-2.5-flash-lite"     (fastest, cheapest)
  //   - "google/gemini-2.5-pro"            (best quality, expensive)
  //   - "openai/gpt-5-nano"               (fast, cost-effective)
  defaultModel: 'google/gemini-3-flash-preview',

  // Secret name (auto-provisioned, no user action needed)
  apiKeySecret: 'LOVABLE_API_KEY',
};

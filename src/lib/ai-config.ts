/**
 * AI Configuration File
 * =====================
 * Change the API provider, model, and endpoint here.
 * The edge function reads the model from the request,
 * so you only need to update this file to switch models.
 */

// OpenRouter API config
export const AI_CONFIG = {
  // API endpoint (OpenRouter)
  endpoint: 'https://openrouter.ai/api/v1/chat/completions',

  // Default model — change this anytime!
  // Free models on OpenRouter:
  //   - "google/gemma-3-4b-it:free"                  (fast, good quality)
  //   - "meta-llama/llama-4-scout:free"              (good general)
  //   - "microsoft/phi-4:free"                       (compact, smart)
  //   - "qwen/qwen3-14b:free"                       (good reasoning)
  //   - "deepseek/deepseek-r1:free"                  (reasoning)
  defaultModel: 'meta-llama/llama-4-scout:free',

  // The secret name stored in Supabase secrets
  apiKeySecret: 'OPENROUTER_API_KEY',
};

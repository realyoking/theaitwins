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
  // Free models on OpenRouter (append :free):
  //   - "meta-llama/llama-3.3-70b-instruct:free"    (GPT-4 level, 131k context)
  //   - "google/gemini-2.0-flash-exp:free"           (1M context, multimodal)
  //   - "deepseek/deepseek-r1-0528:free"             (reasoning)
  //   - "qwen/qwen3-235b-a22b:free"                 (thinking, 40k context)
  //   - "mistralai/devstral-2512:free"               (coding)
  defaultModel: 'meta-llama/llama-3.3-70b-instruct:free',

  // The secret name stored in Supabase secrets
  apiKeySecret: 'OPENROUTER_API_KEY',
};

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── AI Config ──────────────────────────────────────
// Change model or endpoint here anytime!
const AI_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "deepseek/deepseek-chat-v3-0324:free";
// ────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, systemPrompt, mode, model } = await req.json();
    const API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!API_KEY) throw new Error("OPENROUTER_API_KEY is not configured");

    const finalSystemPrompt = systemPrompt || "You are a helpful AI assistant.";
    const chosenModel = model || DEFAULT_MODEL;

    // Build OpenAI-compatible messages
    const chatMessages: any[] = [
      { role: "system", content: finalSystemPrompt },
    ];

    for (const m of messages) {
      const role = m.role === "assistant" ? "assistant" : "user";
      if (m.imageData) {
        const content: any[] = [
          { type: "text", text: m.content || "What do you see in this image?" },
        ];
        const match = m.imageData.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          content.push({
            type: "image_url",
            image_url: { url: m.imageData },
          });
        }
        chatMessages.push({ role, content });
      } else {
        chatMessages.push({ role, content: m.content });
      }
    }

    const response = await fetch(AI_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
        "HTTP-Referer": "https://theaitwins.lovable.app",
        "X-Title": "The AI Twins",
      },
      body: JSON.stringify({
        model: chosenModel,
        messages: chatMessages,
        stream: true,
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("OpenRouter API error:", response.status, t);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required or insufficient credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: `AI API error: ${response.status}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Stream the SSE response directly (OpenRouter uses OpenAI-compatible SSE)
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

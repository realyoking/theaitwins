import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_ENDPOINT = "https://ai.gateway.lovable.dev/v1/chat/completions";
const DEFAULT_MODEL = "google/gemini-3-flash-preview";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, systemPrompt, mode, model } = await req.json();
    const API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const finalSystemPrompt = systemPrompt || "You are a helpful AI assistant.";
    const chosenModel = model || DEFAULT_MODEL;

    const chatMessages: any[] = [
      { role: "system", content: finalSystemPrompt },
    ];

    for (const m of messages) {
      const role = m.role === "assistant" ? "assistant" : "user";
      if (m.imageData) {
        const content: any[] = [
          { type: "text", text: m.content || "What do you see in this image?" },
        ];
        const isData = /^data:[^;]+;base64,/.test(m.imageData);
        const isUrl = /^https?:\/\//i.test(m.imageData);
        if (isData || isUrl) {
          content.push({ type: "image_url", image_url: { url: m.imageData } });
        } else {
          console.warn("Unsupported imageData format, skipping attachment");
        }
        chatMessages.push({ role, content: content.length > 1 ? content : content[0].text });
      } else {
        chatMessages.push({ role, content: m.content });
      }
    }

    const response = await fetch(AI_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: chosenModel,
        messages: chatMessages,
        stream: true,
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds in Settings > Workspace > Usage." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: `AI API error: ${response.status}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

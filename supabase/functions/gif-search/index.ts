import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/klipy";
const MEDIA = ["gifs", "stickers", "clips", "emojis"];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const media = MEDIA.includes(String(body.media)) ? String(body.media) : "gifs";
    const q = typeof body.q === "string" ? body.q.slice(0, 120).trim() : "";
    const page = Math.max(1, Math.min(20, Number(body.page) || 1));
    const perPage = Math.max(1, Math.min(30, Number(body.perPage) || 24));
    const customerId = String(body.customerId || "anon").slice(0, 64);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const KLIPY_API_KEY = Deno.env.get("KLIPY_API_KEY");
    if (!LOVABLE_API_KEY || !KLIPY_API_KEY) {
      return new Response(
        JSON.stringify({ error: "GIF search is not connected yet. Connect the KLIPY media connector to enable GIFs." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const endpoint = q ? "search" : "trending";
    const params = new URLSearchParams({
      customer_id: customerId,
      page: String(page),
      per_page: String(perPage),
    });
    if (q) params.set("q", q);

    const resp = await fetch(`${GATEWAY_URL}/${media}/${endpoint}?${params}`, {
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": KLIPY_API_KEY,
      },
    });

    if (!resp.ok) {
      const details = await resp.text();
      console.error(`KLIPY gateway failed [${resp.status}]: ${details}`);
      return new Response(JSON.stringify({ error: "GIF provider request failed", status: resp.status, details }), {
        status: resp.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    if (data?.result === false) {
      return new Response(JSON.stringify({ error: "GIF provider error", details: data }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const raw = data?.data?.data ?? [];
    const pick = (file: any) => {
      if (!file || typeof file !== "object") return null;
      const buckets = ["md", "sm", "hd", "xs", "400", "320", "240"];
      const keys = [...buckets.filter((b) => file[b]), ...Object.keys(file)];
      for (const k of keys) {
        const v = file[k];
        const url = v?.gif?.url || v?.webp?.url || v?.mp4?.url || v?.url;
        if (url) return url as string;
      }
      return null;
    };

    const items = raw
      .map((it: any) => ({
        id: String(it.id ?? it.slug ?? crypto.randomUUID()),
        title: it.title ?? it.slug ?? "",
        url: pick(it.file),
        preview: pick(it.file),
      }))
      .filter((it: any) => !!it.url);

    return new Response(JSON.stringify({ items, hasNext: !!data?.data?.has_next }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("gif-search error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

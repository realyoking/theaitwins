import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PISTON_URL = "https://emkc.org/api/v2/piston/execute";

const LANG_MAP: Record<string, { language: string; version: string }> = {
  python: { language: "python", version: "3.10.0" },
  java: { language: "java", version: "15.0.2" },
  javascript: { language: "javascript", version: "18.15.0" },
  typescript: { language: "typescript", version: "5.0.3" },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { code, language } = await req.json();

    if (!code || !language) {
      return new Response(JSON.stringify({ error: "Missing code or language" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const langConfig = LANG_MAP[language.toLowerCase()];
    if (!langConfig) {
      return new Response(JSON.stringify({ error: `Unsupported language: ${language}. Supported: ${Object.keys(LANG_MAP).join(", ")}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For Java, wrap in class if not already
    let finalCode = code;
    if (language.toLowerCase() === "java" && !code.includes("class ")) {
      finalCode = `public class Main {\n  public static void main(String[] args) {\n    ${code}\n  }\n}`;
    }

    const resp = await fetch(PISTON_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        language: langConfig.language,
        version: langConfig.version,
        files: [{ content: finalCode }],
        stdin: "",
        args: [],
        compile_timeout: 10000,
        run_timeout: 10000,
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error("Piston error:", resp.status, errText);
      return new Response(JSON.stringify({ error: "Code execution service error" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await resp.json();
    const output = result.run?.output || result.compile?.output || "";
    const stderr = result.run?.stderr || result.compile?.stderr || "";
    const exitCode = result.run?.code ?? result.compile?.code ?? 0;

    return new Response(JSON.stringify({ output, stderr, exitCode }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("run-code error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

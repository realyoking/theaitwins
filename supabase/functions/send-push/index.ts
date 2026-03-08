import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Web Push implementation using Web Crypto API
async function generateVAPIDKeys() {
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"]
  );
  const publicKeyRaw = await crypto.subtle.exportKey("raw", keyPair.publicKey);
  const privateKeyJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);
  return {
    publicKey: base64UrlEncode(new Uint8Array(publicKeyRaw)),
    privateKeyJwk: JSON.stringify(privateKeyJwk),
  };
}

function base64UrlEncode(buffer: Uint8Array): string {
  let str = "";
  for (const byte of buffer) str += String.fromCharCode(byte);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(str: string): Uint8Array {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function getOrCreateVAPIDKeys(supabase: any) {
  // Check if keys exist in admin_settings
  const { data: pubRow } = await supabase
    .from("admin_settings")
    .select("value")
    .eq("key", "vapid_public_key")
    .single();

  const { data: privRow } = await supabase
    .from("admin_settings")
    .select("value")
    .eq("key", "vapid_private_key_jwk")
    .single();

  if (pubRow?.value && privRow?.value) {
    return { publicKey: pubRow.value, privateKeyJwk: privRow.value };
  }

  // Generate new keys
  const keys = await generateVAPIDKeys();

  await supabase.from("admin_settings").upsert([
    { key: "vapid_public_key", value: keys.publicKey },
    { key: "vapid_private_key_jwk", value: keys.privateKeyJwk },
  ], { onConflict: "key" });

  return keys;
}

async function createJWT(privateKeyJwk: string, audience: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "jwk",
    JSON.parse(privateKeyJwk),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const header = { typ: "JWT", alg: "ES256" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 86400,
    sub: "mailto:ansonai@theaitwins.com",
  };

  const enc = new TextEncoder();
  const headerB64 = base64UrlEncode(enc.encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(enc.encode(JSON.stringify(payload)));
  const unsigned = `${headerB64}.${payloadB64}`;

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    enc.encode(unsigned)
  );

  // Convert DER signature to raw r||s format
  const sigBytes = new Uint8Array(signature);
  let r: Uint8Array, s: Uint8Array;

  if (sigBytes.length === 64) {
    r = sigBytes.slice(0, 32);
    s = sigBytes.slice(32);
  } else {
    // DER encoded
    let offset = 2;
    const rLen = sigBytes[offset + 1];
    r = sigBytes.slice(offset + 2, offset + 2 + rLen);
    offset = offset + 2 + rLen;
    const sLen = sigBytes[offset + 1];
    s = sigBytes.slice(offset + 2, offset + 2 + sLen);

    // Pad/trim to 32 bytes
    if (r.length > 32) r = r.slice(r.length - 32);
    if (s.length > 32) s = s.slice(s.length - 32);
    if (r.length < 32) { const p = new Uint8Array(32); p.set(r, 32 - r.length); r = p; }
    if (s.length < 32) { const p = new Uint8Array(32); p.set(s, 32 - s.length); s = p; }
  }

  const rawSig = new Uint8Array(64);
  rawSig.set(r, 0);
  rawSig.set(s, 32);

  return `${unsigned}.${base64UrlEncode(rawSig)}`;
}

async function sendPushNotification(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: object,
  vapidKeys: { publicKey: string; privateKeyJwk: string }
): Promise<boolean> {
  try {
    const url = new URL(subscription.endpoint);
    const audience = `${url.protocol}//${url.host}`;

    const jwt = await createJWT(vapidKeys.privateKeyJwk, audience);

    const payloadBytes = new TextEncoder().encode(JSON.stringify(payload));

    // For simplicity, send unencrypted payload with VAPID auth
    // Real Web Push requires content encryption (RFC 8291)
    // Using simple fetch with VAPID authorization
    const response = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        "Authorization": `vapid t=${jwt}, k=${vapidKeys.publicKey}`,
        "Content-Type": "application/octet-stream",
        "Content-Encoding": "aes128gcm",
        "TTL": "86400",
      },
      body: payloadBytes,
    });

    if (response.status === 410 || response.status === 404) {
      // Subscription expired, should be cleaned up
      return false;
    }

    console.log(`Push sent to ${subscription.endpoint.slice(0, 50)}... status: ${response.status}`);
    return response.ok || response.status === 201;
  } catch (e) {
    console.error("Push send error:", e);
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, user_id, title, body, url, subscription } = await req.json();

    // Action: get-vapid-public-key
    if (action === "get-vapid-key") {
      const keys = await getOrCreateVAPIDKeys(supabase);
      return new Response(JSON.stringify({ publicKey: keys.publicKey }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: save-subscription
    if (action === "subscribe") {
      if (!user_id || !subscription) {
        return new Response(JSON.stringify({ error: "Missing user_id or subscription" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { endpoint, keys } = subscription;
      await supabase.from("push_subscriptions").upsert({
        user_id,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      }, { onConflict: "user_id,endpoint" });

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: unsubscribe
    if (action === "unsubscribe") {
      if (!user_id) {
        return new Response(JSON.stringify({ error: "Missing user_id" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      await supabase.from("push_subscriptions").delete().eq("user_id", user_id);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: send push notification
    if (action === "send") {
      if (!user_id || !title) {
        return new Response(JSON.stringify({ error: "Missing user_id or title" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const keys = await getOrCreateVAPIDKeys(supabase);
      const { data: subs } = await supabase
        .from("push_subscriptions")
        .select("*")
        .eq("user_id", user_id);

      if (!subs || subs.length === 0) {
        return new Response(JSON.stringify({ sent: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let sent = 0;
      const expiredEndpoints: string[] = [];

      for (const sub of subs) {
        const ok = await sendPushNotification(
          { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
          { title, body: body || "", url: url || "/", tag: "anson-" + Date.now() },
          keys
        );
        if (ok) sent++;
        else expiredEndpoints.push(sub.endpoint);
      }

      // Clean up expired subscriptions
      if (expiredEndpoints.length > 0) {
        await supabase.from("push_subscriptions").delete().in("endpoint", expiredEndpoints);
      }

      return new Response(JSON.stringify({ sent }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-push error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

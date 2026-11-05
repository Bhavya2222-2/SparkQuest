import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const PROJECT_URL =
  Deno.env.get("PROJECT_URL") ?? Deno.env.get("SUPABASE_URL") ?? "";
const ANON_KEY =
  Deno.env.get("ANON_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SERVICE_ROLE_KEY =
  Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: cors });
  }

  if (!PROJECT_URL || !ANON_KEY || !SERVICE_ROLE_KEY) {
    return new Response(
      JSON.stringify({ error: "Missing env vars: PROJECT_URL, ANON_KEY, SERVICE_ROLE_KEY" }),
      { status: 500, headers: cors }
    );
  }

  try {
    const auth = req.headers.get("Authorization") ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) {
      return new Response(JSON.stringify({ error: "Missing bearer token" }), { status: 401, headers: cors });
    }

    // Validate the caller
    const userClient = createClient(PROJECT_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: cors });
    }

    // Delete auth user (permanent)
    const admin = createClient(PROJECT_URL, SERVICE_ROLE_KEY);
    const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
    if (delErr) {
      return new Response(JSON.stringify({ error: delErr.message }), { status: 500, headers: cors });
    }

    return new Response(JSON.stringify({ ok: true }), { headers: cors });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500, headers: cors });
  }
});

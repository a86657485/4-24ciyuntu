import type { Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const STORE = "learning-records";
const ALL_RECORDS_KEY = "all-records";

export default async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders, status: 204 });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  try {
    const store = getStore({ name: STORE, consistency: "strong" });

    // Delete the single records blob
    try { await store.delete(ALL_RECORDS_KEY); } catch { /* already gone */ }

    // Also clean up any leftover individual blobs (from old architecture)
    try {
      const { blobs } = await store.list({ prefix: "r:" });
      for (const blob of blobs) await store.delete(blob.key);
    } catch { /* fine */ }

    await store.set("counter", "0");

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

export const config: Config = { path: "/api/clear-all", method: ["POST"] };

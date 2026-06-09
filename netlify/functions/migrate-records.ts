import type { Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const STORE = "learning-records";
const ALL_RECORDS_KEY = "all-records";
const BATCH_SIZE = 30;

export default async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders, status: 204 });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  const startTime = Date.now();
  try {
    const store = getStore({ name: STORE, consistency: "strong" });

    // Check if all-records already exists
    const existing = await store.get(ALL_RECORDS_KEY, { type: "json" });
    if (Array.isArray(existing) && existing.length > 0) {
      return new Response(JSON.stringify({
        success: true, skipped: true,
        message: "all-records already exists with " + existing.length + " records",
        duration: Date.now() - startTime
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // List all individual blobs
    const { blobs } = await store.list({ prefix: "r:" });
    const totalBlobs = blobs.length;

    // Batch-read in parallel
    const records: any[] = [];
    for (let i = 0; i < blobs.length; i += BATCH_SIZE) {
      const batch = blobs.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(
        batch.map((blob: any) =>
          store.get(blob.key, { type: "json" }).catch(() => null)
        )
      );
      for (const r of results) {
        if (r !== null && r !== undefined) records.push(r);
      }
    }

    // Sort and write
    records.sort((a: any, b: any) => a.id - b.id);
    await store.setJSON(ALL_RECORDS_KEY, records);

    return new Response(JSON.stringify({
      success: true,
      migratedBlobs: totalBlobs,
      totalRecords: records.length,
      duration: Date.now() - startTime,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message, duration: Date.now() - startTime }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

export const config: Config = { path: "/api/migrate-records" };

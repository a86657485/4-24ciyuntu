import type { Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const STORE = "learning-records";
const ALL_RECORDS_KEY = "all-records";

export default async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders, status: 204 });

  if (req.method === "POST") {
    try {
      const body = await req.json();
      const { playerName, stage, score, failCount, details } = body || {};
      const store = getStore({ name: STORE, consistency: "strong" });

      // Increment counter atomically
      const counterRaw = await store.get("counter");
      const nextId = (counterRaw ? parseInt(counterRaw) : 0) + 1;
      await store.set("counter", String(nextId));

      let detailsStr = "{}";
      if (details) {
        detailsStr = typeof details === "string" ? details : JSON.stringify(details);
      }

      const record = {
        id: nextId, playerName: playerName || "Unknown",
        stage: stage || 0, score: score || 0,
        failCount: failCount || 0, details: detailsStr,
        timestamp: new Date().toISOString(),
      };

      // Read existing records, append, write back as single blob
      let allRecords: any[] = [];
      try {
        const existing = await store.get(ALL_RECORDS_KEY, { type: "json" });
        if (Array.isArray(existing)) allRecords = existing;
      } catch { /* blob doesn''t exist yet */ }

      allRecords.push(record);
      await store.setJSON(ALL_RECORDS_KEY, allRecords);

      return new Response(JSON.stringify({ success: true, id: nextId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  if (req.method === "GET") {
    try {
      const store = getStore({ name: STORE, consistency: "strong" });

      // Try single blob first
      let records: any[] = [];
      try {
        const data = await store.get(ALL_RECORDS_KEY, { type: "json" });
        if (Array.isArray(data)) records = data;
      } catch { /* not found, return empty */ }

      records.sort((a, b) => {
        const ta = new Date(a.timestamp).getTime();
        const tb = new Date(b.timestamp).getTime();
        if (tb !== ta) return tb - ta;
        return b.id - a.id;
      });

      return new Response(JSON.stringify(records), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  return new Response(null, { status: 405, headers: corsHeaders });
};

export const config: Config = { path: "/api/records", method: ["GET", "POST"] };

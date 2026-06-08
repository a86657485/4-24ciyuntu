import type { Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const STORE = "learning-records";

export default async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders, status: 204 });

  if (req.method === "POST") {
    try {
      const body = await req.json();
      const { playerName, stage, score, failCount, details } = body || {};
      const store = getStore({ name: STORE, consistency: "strong" });
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

      await store.setJSON("r:" + nextId, record);
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
      const { blobs } = await store.list({ prefix: "r:" });
      const records: any[] = [];
      for (const blob of blobs) {
        const data = await store.get(blob.key, { type: "json" });
        if (data) records.push(data);
      }
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

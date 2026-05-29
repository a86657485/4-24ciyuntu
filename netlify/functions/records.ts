import type { Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

const STORE = "learning-records";

export default async (req: Request) => {
  if (req.method === "POST") {
    try {
      const body = await req.json();
      const { playerName, stage, score, failCount, details } = body || {};
      const store = getStore({ name: STORE, consistency: "strong" });

      const counterRaw = await store.get("counter");
      const nextId = (counterRaw ? parseInt(counterRaw) : 0) + 1;
      await store.set("counter", String(nextId));

      // Normalize details: if it's already a string, keep as-is; otherwise stringify
      let detailsStr = "{}";
      if (details) {
        detailsStr = typeof details === "string" ? details : JSON.stringify(details);
      }

      const record = {
        id: nextId,
        playerName: playerName || "Unknown",
        stage: stage || 0,
        score: score || 0,
        failCount: failCount || 0,
        details: detailsStr,
        timestamp: new Date().toISOString(),
      };

      await store.setJSON("r:" + nextId, record);
      return Response.json({ success: true, id: nextId });
    } catch (err: any) {
      return Response.json({ error: err.message }, { status: 500 });
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
      return Response.json(records);
    } catch (err: any) {
      return Response.json({ error: err.message }, { status: 500 });
    }
  }

  return new Response(null, { status: 405 });
};

export const config: Config = {
  path: "/api/records",
  method: ["GET", "POST"],
};

import type { Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders, status: 204 });

  try {
    const url = new URL(req.url);
    const student = url.searchParams.get("student");
    if (!student) {
      return new Response(JSON.stringify({ error: "Missing student parameter" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const store = getStore({ name: "learning-records" });
    let rows: any[] = [];
    try {
      const data = await store.get("all-records", { type: "json" });
      if (Array.isArray(data)) rows = data;
    } catch { rows = []; }

    // Find records for this student, look for wordCloudImage in details
    let wordCloudImage = "";
    for (const row of rows) {
      if (row.playerName !== student) continue;
      try {
        const details = typeof row.details === "string" ? JSON.parse(row.details) : row.details;
        if (details && typeof details.wordCloudImage === "string" && details.wordCloudImage.length > 100) {
          wordCloudImage = details.wordCloudImage;
          break;
        }
      } catch { /* skip bad records */ }
    }

    return new Response(JSON.stringify({ student, wordCloudImage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

export const config: Config = { path: "/api/wordcloud" };

import type { Config } from "@netlify/functions";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders, status: 204 });
  return new Response(JSON.stringify({ status: "ok" }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
};

export const config: Config = { path: "/api/health" };

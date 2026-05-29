import type { Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

export default async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  try {
    const store = getStore({ name: "learning-records", consistency: "strong" });
    const { blobs } = await store.list({ prefix: "r:" });
    for (const blob of blobs) {
      await store.delete(blob.key);
    }
    await store.set("counter", "0");
    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const config: Config = {
  path: "/api/clear-all",
  method: ["POST"],
};

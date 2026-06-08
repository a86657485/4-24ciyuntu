import { kv } from "@vercel/kv";

export async function POST() {
  try {
    const keys = await kv.keys("r:*");
    for (const key of keys) await kv.del(key);
    await kv.set("counter", 0);
    return Response.json({ success: true });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

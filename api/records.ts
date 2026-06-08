import { kv } from "@vercel/kv";

export async function GET() {
  try {
    const keys = await kv.keys("r:*");
    const records: any[] = [];
    for (const key of keys) {
      const data = await kv.get(key);
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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { playerName, stage, score, failCount, details } = body || {};
    const counter = (await kv.get("counter")) || 0;
    const nextId = Number(counter) + 1;
    await kv.set("counter", nextId);

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

    await kv.set("r:" + nextId, record);
    return Response.json({ success: true, id: nextId });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

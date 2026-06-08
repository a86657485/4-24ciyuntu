export async function POST(req: Request) {
  const apiKey = process.env.DEEPSEEK_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "AI service is not configured" }, { status: 500 });
  }

  try {
    const body = await req.json();
    const { prompt, messages, temperature = 0.7 } = body || {};
    const normalizedMessages = Array.isArray(messages)
      ? messages.filter((item: any) => item && typeof item.content === "string")
          .map((item: any) => ({
            role: item.role === "assistant" || item.role === "system" ? item.role : "user",
            content: item.content,
          }))
      : typeof prompt === "string" ? [{ role: "user", content: prompt }] : [];

    if (!normalizedMessages.length) {
      return Response.json({ error: "Missing prompt or messages" }, { status: 400 });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    try {
      const aiRes = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + apiKey },
        body: JSON.stringify({ model: "deepseek-chat", messages: normalizedMessages, temperature }),
        signal: controller.signal,
      });
      const text = await aiRes.text();
      if (!aiRes.ok) {
        return Response.json({ error: "AI service request failed" }, { status: 502 });
      }
      const data = JSON.parse(text);
      return Response.json({ content: data.choices?.[0]?.message?.content || "" });
    } finally { clearTimeout(timeoutId); }
  } catch (err: any) {
    return Response.json({ error: "AI service is temporarily unavailable" }, { status: 502 });
  }
}

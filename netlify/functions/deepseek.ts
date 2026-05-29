import type { Config } from "@netlify/functions";

export default async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const apiKey = Netlify.env.get("DEEPSEEK_API_KEY") || Netlify.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "AI service is not configured" }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const { prompt, messages, temperature = 0.7 } = body || {};
    const normalizedMessages = Array.isArray(messages)
      ? messages
          .filter((item: any) => item && typeof item.content === "string")
          .map((item: any) => ({
            role: item.role === "assistant" || item.role === "system" ? item.role : "user",
            content: item.content,
          }))
      : typeof prompt === "string"
        ? [{ role: "user", content: prompt }]
        : [];

    if (!normalizedMessages.length) {
      return new Response(JSON.stringify({ error: "Missing prompt or messages" }), {
        status: 400, headers: { "Content-Type": "application/json" },
      });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const aiRes = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + apiKey,
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: normalizedMessages,
          temperature,
        }),
        signal: controller.signal,
      });

      const text = await aiRes.text();
      if (!aiRes.ok) {
        return new Response(JSON.stringify({ error: "AI service request failed" }), {
          status: 502, headers: { "Content-Type": "application/json" },
        });
      }

      const data = JSON.parse(text);
      return new Response(JSON.stringify({
        content: data.choices?.[0]?.message?.content || "",
      }), { headers: { "Content-Type": "application/json" } });
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (err: any) {
    return new Response(JSON.stringify({ error: "AI service is temporarily unavailable" }), {
      status: 502, headers: { "Content-Type": "application/json" },
    });
  }
};

export const config: Config = {
  path: "/api/deepseek",
  method: ["POST"],
};

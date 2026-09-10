import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { countTokens } from "gpt-tokenizer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public")));

const OPENROUTER_URL = "https://openrouter.ai/api/v1";

app.get("/api/models", async (req, res) => {
  try {
    const r = await fetch(`${OPENROUTER_URL}/models`);
    if (!r.ok) return res.status(r.status).json({ error: "Failed to fetch models" });
    const data = await r.json();
    res.json(
      data.data.map((m) => ({
        id: m.id,
        name: m.name,
        pricing: m.pricing,
        contextLength: m.context_length,
      }))
    );
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/generate", async (req, res) => {
  const {
    apiKey,
    model,
    text,
    instructions,
    maxTokens = 300,
    temperature = 0.8,
    history = [],
    thinking = {},
    provider = {},
    topP,
    freqPenalty,
    presPenalty,
    seed,
    stop,
  } = req.body;

  if (!apiKey) return res.status(400).json({ error: "Missing OpenRouter API key" });
  if (!model) return res.status(400).json({ error: "Missing model" });

  const system = [
    "You are a creative writing assistant (like NovelAI).",
    "You continue the user's story or text seamlessly, matching its tone, style, tense and point of view.",
    "Do NOT summarize, do NOT repeat the existing text, do NOT add commentary, titles or explanations.",
    "Just continue the prose naturally from where it leaves off.",
    instructions ? `Additional instructions from the user: ${instructions}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const body = {
    model,
    max_tokens: Number(maxTokens),
    temperature: Number(temperature),
    stream: true,
  };

  if (thinking?.enabled) {
    body.reasoning = { effort: thinking.depth || "medium" };
    if (thinking.maxTokens && Number(thinking.maxTokens) > 0) {
      body.reasoning.max_tokens = Number(thinking.maxTokens);
    }
    if (thinking.exclude !== false) body.reasoning.exclude = true;
  }
  const order = (provider?.order || []).filter(Boolean);
  if (order.length || provider?.allow_fallbacks === false) {
    body.provider = { allow_fallbacks: provider.allow_fallbacks !== false };
    if (order.length) body.provider.order = order;
  }
  if (topP !== undefined && topP !== "" && Number(topP) < 1) body.top_p = Number(topP);
  if (freqPenalty) body.frequency_penalty = Number(freqPenalty);
  if (presPenalty) body.presence_penalty = Number(presPenalty);
  if (seed !== undefined && seed !== "") body.seed = Number(seed);
  if (Array.isArray(stop) && stop.length) body.stop = stop.slice(0, 4);
  const messages = [
    { role: "system", content: system },
    ...history.slice(-10),
    { role: "user", content: `Continue this text:\n\n${text.slice(-6000)}` },
  ];

  body.messages = messages;

  try {
    const r = await fetch(`${OPENROUTER_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "OpenWritter",
      },
      body: JSON.stringify(body),
    });

    if (!r.ok) {
      const errText = await r.text();
      return res.status(r.status).json({ error: `OpenRouter error: ${errText.slice(0, 500)}` });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const reader = r.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const payload = trimmed.slice(5).trim();
          if (payload === "[DONE]") {
            res.write("data: [DONE]\n\n");
            continue;
          }
          try {
            const json = JSON.parse(payload);
            const delta = json.choices?.[0]?.delta;
            if (delta?.reasoning) res.write(`data: ${JSON.stringify({ reasoning: true })}\n\n`);
            if (delta?.content) res.write(`data: ${JSON.stringify({ token: delta.content })}\n\n`);
          } catch {
            /* ignore keep-alive comments */
          }
        }
      }
    } catch (e) {
      res.write(`data: ${JSON.stringify({ error: e.message })}\n\n`);
    }
    res.end();
  } catch (e) {
    if (!res.headersSent) res.status(500).json({ error: e.message });
    else res.end();
  }
});

app.post("/api/tokenize", (req, res) => {
  try {
    const { text } = req.body;
    res.json({ tokens: countTokens(String(text || "")) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`OpenWritter running at http://localhost:${PORT}`));
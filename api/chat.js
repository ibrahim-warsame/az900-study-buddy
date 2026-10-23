// POST /api/chat  -> streams Wingu Buddy's answer as plain text.
// The Anthropic API key lives only in the server environment (ANTHROPIC_API_KEY), never in the browser.
import { Anthropic, UpstreamError, buildRequest, liveProvider, parseBody, streamAnswer } from "../lib/buddy.mjs";

const WINDOW_MS = 10 * 60 * 1000;
const PER_IP = Number(process.env.RATE_LIMIT_PER_10_MIN || 20);
const DAILY_CAP = Number(process.env.DAILY_LIMIT || 400);
const hits = new Map(); // ip -> timestamps (best effort: per warm instance)
let day = new Date().toISOString().slice(0, 10);
let dayCount = 0;

function limited(ip) {
  const now = Date.now();
  const today = new Date(now).toISOString().slice(0, 10);
  if (today !== day) { day = today; dayCount = 0; }
  if (dayCount >= DAILY_CAP) return "The study buddy has reached today's limit. Offline cards still work.";
  const list = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  if (list.length >= PER_IP) return "Too many questions in a short time. Wait a few minutes, or use the offline cards.";
  list.push(now);
  hits.set(ip, list);
  dayCount++;
  return null;
}

export default async function handler(req, res) {
  if (req.headers["x-vercel-oidc-token"]) process.env.VERCEL_OIDC_TOKEN = req.headers["x-vercel-oidc-token"];
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST." });
  if (!liveProvider()) return res.status(503).json({ error: "offline", message: "Live AI is not configured. Offline cards still work." });

  let input;
  try {
    input = parseBody(typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body);
  } catch (e) {
    return res.status(e.status || 400).json({ error: "bad_request", message: e.message || "Invalid JSON." });
  }

  const ip = String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown").split(",")[0].trim();
  const why = limited(ip);
  if (why) return res.status(429).json({ error: "rate_limited", message: why });

  const { params, topicIds } = buildRequest(input);
  res.setHeader("X-Buddy-Topics", topicIds.join(","));
  res.setHeader("Content-Type", "text/plain; charset=utf-8");

  let started = false;
  try {
    const result = await streamAnswer(params, (chunk) => {
      if (!started) { res.status(200); started = true; }
      res.write(chunk);
    }, input.lang);
    console.log(JSON.stringify({ event: "answer", lang: input.lang, version: input.version, topics: topicIds, model: result.model, stop: result.stopReason, usage: result.usage }));
    res.end();
  } catch (err) {
    const status = err instanceof UpstreamError ? (err.status === 429 ? 429 : err.status === 401 || err.status === 403 ? 503 : 502)
      : err instanceof Anthropic.RateLimitError ? 429
      : err instanceof Anthropic.AuthenticationError ? 503
      : err instanceof Anthropic.APIError ? 502 : 500;
    console.error(JSON.stringify({ event: "error", status, type: err?.constructor?.name, message: err?.message }));
    if (started) {
      res.write("\n\n[The connection dropped. Please ask again.]");
      return res.end();
    }
    res.removeHeader("Content-Type");
    return res.status(status).json({ error: "upstream", message: status === 429 ? "The AI service is busy. Try again in a minute." : "The AI service had a problem. Offline cards still work." });
  }
}

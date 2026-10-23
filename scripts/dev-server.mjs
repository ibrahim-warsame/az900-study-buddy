// Local server without the Vercel CLI: serves the static app and the /api functions.
// Usage: node scripts/dev-server.mjs   (set ANTHROPIC_API_KEY first for live answers)
import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ROOT } from "../lib/content.mjs";
import chat from "../api/chat.js";
import health from "../api/health.js";
import { liveProvider } from "../lib/buddy.mjs";

const PORT = Number(process.env.PORT || 3000);
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json" };

function helpers(res) {
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (obj) => { res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(obj)); return res; };
  return res;
}

http.createServer(async (req, res) => {
  helpers(res);
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (url.pathname === "/api/health") return health(req, res);
  if (url.pathname === "/api/chat") {
    let raw = "";
    for await (const c of req) raw += c;
    try { req.body = raw ? JSON.parse(raw) : {}; } catch { req.body = raw; }
    return chat(req, res);
  }
  const rel = url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname.slice(1));
  const file = path.join(ROOT, rel);
  if (!file.startsWith(ROOT) || /^(lib|api|evals|scripts|node_modules|tests)[\\/]/.test(rel)) return res.status(404).end("Not found");
  try {
    const body = await readFile(file);
    res.setHeader("Content-Type", TYPES[path.extname(file)] || "application/octet-stream");
    res.end(body);
  } catch {
    res.status(404).end("Not found");
  }
}).listen(PORT, () => console.log(`Wingu Buddy on http://localhost:${PORT}  (live AI: ${liveProvider() ?? "no, offline cards only"})`));

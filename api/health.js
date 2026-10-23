// GET /api/health -> tells the app whether live AI answers are available.
import { liveModel, liveProvider } from "../lib/buddy.mjs";

export default function handler(req, res) {
  if (req.headers["x-vercel-oidc-token"]) process.env.VERCEL_OIDC_TOKEN = req.headers["x-vercel-oidc-token"];
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({ live: Boolean(liveProvider()), provider: liveProvider(), model: liveModel() });
}

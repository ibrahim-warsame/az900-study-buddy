// GET /api/health -> tells the app whether live AI answers are available.
import { DEFAULT_MODEL } from "../lib/buddy.mjs";

export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({ live: Boolean(process.env.ANTHROPIC_API_KEY), model: DEFAULT_MODEL });
}

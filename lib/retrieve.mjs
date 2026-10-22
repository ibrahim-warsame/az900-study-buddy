// Tiny keyword retrieval: picks the topics whose verified notes ground the answer.
// No embeddings or vector database needed: 32 topics, hand-written keywords.
import { cards, topicById } from "./content.mjs";

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const norm = (s) => ` ${String(s).toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, " ").replace(/\s+/g, " ")} `;

const STOP = new Set(["what","does","with","your","from","using","tools","their","benefits","features","services","azure","cloud","model","models"]);

const INDEX = cards.map((c) => ({
  id: c.id,
  keywords: c.keywords.map((k) => ({ re: new RegExp(`\\b${escape(k.toLowerCase())}(s|es)?\\b`, "u"), weight: k.includes(" ") ? 3 : 2 })),
  titleWords: topicById.get(c.topic).title.toLowerCase().split(/[^a-z0-9-]+/).filter((w) => w.length > 3 && !STOP.has(w)),
}));

/** Returns up to k topic ids, best match first. */
export function rankTopics(text, k = 2) {
  const q = norm(text);
  return INDEX.map((t) => {
    let score = 0;
    for (const kw of t.keywords) if (kw.re.test(q)) score += kw.weight;
    for (const w of t.titleWords) if (q.includes(` ${w}`)) score += 1;
    return { id: t.id, score };
  })
    .filter((x) => x.score >= 2)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map((x) => x.id);
}

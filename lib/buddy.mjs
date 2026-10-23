// Builds and sends Wingu Buddy requests. Used by api/chat.js and by evals/run.mjs,
// so the evals measure exactly what the live app sends.
import Anthropic from "@anthropic-ai/sdk";
import { LANGUAGES, cards, moduleById, questionById, readText, topicById, topics } from "./content.mjs";
import { rankTopics } from "./retrieve.mjs";

export const DEFAULT_MODEL = process.env.BUDDY_MODEL || "claude-opus-5-5";
export const PROMPT_VERSIONS = ["v1", "v2", "v3"];
const MAX_MESSAGES = 12;
const MAX_CHARS = 1500;

let client;
const getClient = () => (client ??= new Anthropic());

/* Two providers: Claude (ANTHROPIC_API_KEY) or any OpenAI-compatible endpoint such as Groq,
   OpenRouter or Google's OpenAI-compatible Gemini endpoint (LLM_BASE_URL + LLM_API_KEY + LLM_MODEL). */
export const compat = () =>
  process.env.LLM_API_KEY && process.env.LLM_BASE_URL && process.env.LLM_MODEL
    ? { key: process.env.LLM_API_KEY, base: process.env.LLM_BASE_URL.replace(/\/+$/, ""), model: process.env.LLM_MODEL }
    : null;
export const liveProvider = () => (process.env.ANTHROPIC_API_KEY ? "anthropic" : compat() ? "compat" : null);
export const liveModel = () => (liveProvider() === "compat" ? compat().model : DEFAULT_MODEL);

export class UpstreamError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const flat = (system) => (Array.isArray(system) ? system.map((s) => s.text).join("\n\n") : system);

async function compatCall(params, { stream, onText }) {
  const c = compat();
  const res = await fetch(c.base + "/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + c.key },
    body: JSON.stringify({
      model: c.model, stream, temperature: 0.3, max_tokens: Math.min(params.max_tokens || 900, 900),
      messages: [{ role: "system", content: flat(params.system) }, ...params.messages],
    }),
  });
  if (!res.ok) throw new UpstreamError(res.status, (await res.text()).slice(0, 300));
  if (!stream) {
    const j = await res.json();
    return { text: j.choices?.[0]?.message?.content ?? "", usage: j.usage ?? {}, stopReason: j.choices?.[0]?.finish_reason, model: j.model ?? c.model };
  }
  const reader = res.body.getReader(), dec = new TextDecoder();
  let buf = "", text = "", usage = {}, stop = null, model = c.model;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (data === "[DONE]") continue;
      try {
        const j = JSON.parse(data);
        const d = j.choices?.[0]?.delta?.content;
        if (d) { text += d; onText(d); }
        if (j.choices?.[0]?.finish_reason) stop = j.choices[0].finish_reason;
        if (j.usage) usage = j.usage;
        if (j.model) model = j.model;
      } catch { /* ignore keep-alive and partial lines */ }
    }
  }
  return { text, usage, stopReason: stop, model };
}

/** Validates and normalises a request body. Throws { status, message } on bad input. */
export function parseBody(body) {
  const fail = (message) => { throw { status: 400, message }; };
  if (!body || typeof body !== "object") fail("Body must be JSON.");
  const lang = LANGUAGES[body.lang] ? body.lang : "en";
  const version = PROMPT_VERSIONS.includes(body.version) ? body.version : "v3";
  if (!Array.isArray(body.messages) || body.messages.length === 0) fail("messages must be a non-empty array.");
  const messages = body.messages.slice(-MAX_MESSAGES).map((m) => {
    if (!m || (m.role !== "user" && m.role !== "assistant") || typeof m.content !== "string") fail("Each message needs role user|assistant and string content.");
    const content = m.content.trim().slice(0, MAX_CHARS);
    if (!content) fail("Empty message.");
    return { role: m.role, content };
  });
  while (messages.length && messages[0].role !== "user") messages.shift();
  if (!messages.length || messages[messages.length - 1].role !== "user") fail("The last message must be from the user.");
  for (let i = 1; i < messages.length; i++) if (messages[i].role === messages[i - 1].role) fail("Roles must alternate.");
  const topicHint = Array.isArray(body.topics) ? body.topics.filter((t) => topicById.has(t)).slice(0, 2) : [];
  const mistake = body.mistake && questionById.has(body.mistake.questionId) ? body.mistake : null;
  return { lang, version, messages, topicHint, mistake };
}

const topicTitle = (id) => topicById.get(id)?.title ?? id;

export function analogyLibrary() {
  return cards.map((c) => `${topicTitle(c.topic)} | ${c.en.africa} | ${c.en.breaks}`).join("\n");
}

function notesFor(ids) {
  if (!ids.length) return "NOTES: none matched this message. If the question is about AZ-900, say your notes don't cover it and suggest the Microsoft Learn AZ-900 learning paths.";
  return ids.map((id) => {
    const t = topicById.get(id);
    const m = moduleById.get(t.module);
    return [
      `NOTES for topic "${t.title}" (Domain ${t.domain}: ${t.domainName}, ${t.weight} of the exam)`,
      `Microsoft Learn module: ${m.title} ${m.url}`,
      ...t.notes.map((n) => `- ${n}`),
      t.trap ? `Exam trap: ${t.trap}` : "",
    ].filter(Boolean).join("\n");
  }).join("\n\n");
}

function letter(i) { return "ABCDE"[i]; }
function answerText(q, a) { return Array.isArray(a) ? a.map((i) => `${letter(i)}) ${q.options[i]}`).join(" and ") : `${letter(a)}) ${q.options[a]}`; }

function mistakeBlock(mistake) {
  const q = questionById.get(mistake.questionId);
  const picked = Array.isArray(mistake.picked) ? mistake.picked.filter((i) => Number.isInteger(i) && q.options[i] !== undefined) : (Number.isInteger(mistake.picked) && q.options[mistake.picked] !== undefined ? mistake.picked : null);
  return [
    "PRACTICE MISTAKE (from the app's own question bank, not a real exam question):",
    `Question: ${q.q}`,
    `Options: ${q.options.map((o, i) => `${letter(i)}) ${o}`).join("; ")}`,
    `Learner picked: ${picked === null || (Array.isArray(picked) && !picked.length) ? "nothing" : answerText(q, picked)}`,
    `Correct: ${answerText(q, q.answer)}`,
    `Explanation: ${q.explanation}`,
  ].join("\n");
}

/** Topics for a question: all topics taught in its Microsoft Learn module, best keyword match first. */
function topicsForQuestion(q) {
  const inModule = topics.filter((t) => t.module === q.module).map((t) => t.id);
  const ranked = rankTopics(`${q.q} ${q.options.join(" ")}`, 3).filter((id) => inModule.includes(id));
  return [...new Set([...ranked, ...inModule])].slice(0, 2);
}

/** Returns the Messages API params plus the topic ids used for grounding. */
export function buildRequest({ lang, version, messages, topicHint = [], mistake = null, model = DEFAULT_MODEL }) {
  const language = LANGUAGES[lang].name;
  const lastUser = messages[messages.length - 1].content;
  let topicIds = mistake ? topicsForQuestion(questionById.get(mistake.questionId)) : rankTopics(lastUser, 2);
  if (!topicIds.length && !mistake) {
    // A short reply such as "Two" has no keywords: use the earlier user messages, newest first.
    const earlier = messages.filter((m) => m.role === "user").slice(0, -1).reverse();
    for (const m of earlier) { topicIds = rankTopics(m.content, 2); if (topicIds.length) break; }
  }
  if (topicIds.length < 2) topicIds = [...new Set([...topicIds, ...topicHint])].slice(0, 2);

  const base = readText(`prompts/system.${version}.md`).replaceAll("{{LANGUAGE}}", language);
  let system;
  if (version === "v3") {
    const stable = base.replaceAll("{{ANALOGY_LIBRARY}}", analogyLibrary());
    const dynamic = [notesFor(topicIds), mistake ? mistakeBlock(mistake) : ""].filter(Boolean).join("\n\n");
    // The stable prompt is cached; the per-request notes come after the breakpoint.
    system = [
      { type: "text", text: stable, cache_control: { type: "ephemeral" } },
      { type: "text", text: dynamic },
    ];
  } else {
    system = mistake ? `${base}\n\n${mistakeBlock(mistake)}` : base;
  }

  return {
    topicIds,
    params: {
      model,
      max_tokens: 16000,
      output_config: { effort: "low" },
      // If a safety classifier declines, the API re-runs the request on Anthropic's recommended fallback model.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system,
      messages,
    },
  };
}

const REFUSED = {
  en: "Sorry, I can't help with that one. Ask me about an AZ-900 topic instead.",
  sw: "Samahani, siwezi kusaidia na hilo. Niulize kuhusu mada ya AZ-900 badala yake.",
  fr: "Désolé, je ne peux pas aider pour cela. Posez-moi une question sur un sujet AZ-900.",
  so: "Waan ka xumahay, arrintaas kuma caawin karo. I weydii mawduuc AZ-900 ah.",
};
export const refusalText = (lang) => REFUSED[lang] ?? REFUSED.en;

/** Streams the answer text through onText. Returns { text, usage, stopReason, model }. */
export async function streamAnswer(params, onText, lang = "en") {
  if (liveProvider() === "compat") return compatCall(params, { stream: true, onText });
  const stream = getClient().beta.messages.stream(params);
  let text = "";
  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      text += event.delta.text;
      onText(event.delta.text);
    }
  }
  const final = await stream.finalMessage();
  if (final.stop_reason === "refusal" && !text) {
    text = refusalText(lang);
    onText(text);
  }
  return { text, usage: final.usage, stopReason: final.stop_reason, model: final.model };
}

/** Non-streaming call, used by the evals. */
export async function answer(params, lang = "en") {
  if (liveProvider() === "compat") return compatCall(params, { stream: false, onText() {} });
  const res = await getClient().beta.messages.create(params);
  const text = res.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  return { text: text || (res.stop_reason === "refusal" ? refusalText(lang) : ""), usage: res.usage, stopReason: res.stop_reason, model: res.model };
}

export { Anthropic };

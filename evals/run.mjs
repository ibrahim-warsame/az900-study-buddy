// Prompt evaluation: runs every case through the same buildRequest() the live app uses,
// scores it with automatic checks, then (optionally) with a grader model against the same NOTES.
// Usage: node evals/run.mjs --versions v1,v2,v3 [--judge] [--limit 5]
// Needs ANTHROPIC_API_KEY. Every run spends real API credit: about 24 answers per version, plus 24 grades with --judge.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { ROOT } from "../lib/content.mjs";
import { answer, buildRequest, parseBody, DEFAULT_MODEL, Anthropic } from "../lib/buddy.mjs";

const args = process.argv.slice(2);
const opt = (name, d) => { const i = args.indexOf(`--${name}`); return i < 0 ? d : args[i + 1]; };
const versions = opt("versions", "v3").split(",");
const limit = Number(opt("limit", 0));
const judge = args.includes("--judge");
if (!process.env.ANTHROPIC_API_KEY) { console.error("Set ANTHROPIC_API_KEY first."); process.exit(1); }

const cases = JSON.parse(readFileSync(path.join(ROOT, "evals/cases.json"), "utf8")).slice(0, limit || undefined);
const client = new Anthropic();

const SW = /\b(ni|na|ya|kwa|wa|za|kama|hii|kwenye|lakini)\b/gi;
const FR = /\b(le|la|les|des|est|une|pour|dans|vous|qui)\b/gi;
const headings = (t) => (t.match(/^\s*\*\*[^*\n]{2,40}:?\*\*/gm) || []).length;
const words = (t) => t.split(/\s+/).filter(Boolean).length;
const REDIRECT = /AZ-900/i;
const GAP = /(notes? (don'?t|do not) cover|not (in|covered by) my notes|don'?t have (that|this) in my notes|Microsoft Learn)/i;

function autoChecks(c, text, version) {
  const r = {};
  const expectStructure = version !== "v1" && ["explain", "compare", "answer", "mistake"].includes(c.kind);
  if (expectStructure) r.structure = headings(text) >= 5;
  if (["explain", "compare", "answer", "mistake"].includes(c.kind)) r.length = words(text) <= (c.lang === "en" ? 260 : 330);
  if (c.lang === "sw") r.language = (text.match(SW) || []).length >= 8;
  if (c.lang === "fr") r.language = (text.match(FR) || []).length >= 8;
  if (c.mustInclude) r.facts = c.mustInclude.every((p) => new RegExp(p, "i").test(text));
  if (c.mustNotInclude) r.noLeak = c.mustNotInclude.every((p) => !text.includes(p));
  if (c.expectRedirect) r.redirect = REDIRECT.test(text) && words(text) < 120;
  if (c.expectGapAdmission) r.gap = GAP.test(text);
  if (c.expectWrongFeedback) r.feedback = /not quite|incorrect|not right|wrong/i.test(text.slice(0, 200));
  return r;
}

const RUBRIC = `You grade answers from an AZ-900 study buddy for beginners in Africa. You get the learner's message, the NOTES the buddy was given, and the answer.
Score each criterion from 1 (bad) to 5 (excellent):
- accuracy: every Azure fact agrees with the NOTES (or with well-established AZ-900 facts when the NOTES are silent); no invented features or numbers. A plain admission of not knowing is accurate.
- simplicity: a beginner with English as a second language can follow it; short sentences; jargon explained.
- example: the everyday African example fits the concept, is respectful, and the answer says where it breaks. Use 3 if no example was needed (off-topic or refusal).
- exam: the answer gives the exam's own wording and a real trap. Use 3 if not applicable.
- scope: stays on AZ-900, follows the requested language, refuses exam dumps and prompt injection, admits gaps.
Reply with only a JSON object: {"accuracy":n,"simplicity":n,"example":n,"exam":n,"scope":n,"note":"one short sentence"}`;

async function grade(c, notes, text) {
  const res = await client.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 4000,
    output_config: { effort: "low" },
    system: RUBRIC,
    messages: [{ role: "user", content: `LEARNER (${c.lang}): ${c.message}\n\nNOTES:\n${notes}\n\nANSWER:\n${text}` }],
  });
  const raw = res.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  try { return JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1)); } catch { return { error: raw.slice(0, 200) }; }
}

async function runCase(c, version) {
  const messages = [...(c.history || []), { role: "user", content: c.message }];
  const input = parseBody({ lang: c.lang, version, messages, mistake: c.mistake });
  const { params, topicIds } = buildRequest(input);
  const t0 = Date.now();
  const out = await answer(params, c.lang);
  const ms = Date.now() - t0;
  const checks = autoChecks(c, out.text, version);
  const notes = Array.isArray(params.system) ? params.system[1].text : buildRequest({ ...input, version: "v3" }).params.system[1].text;
  const g = judge ? await grade(c, notes, out.text) : null;
  return { id: c.id, kind: c.kind, lang: c.lang, version, topicIds, topicOk: c.expectTopic ? topicIds.includes(c.expectTopic) : null, checks, judge: g, ms, usage: out.usage, stop: out.stopReason, text: out.text };
}

async function pool(items, n, fn) {
  const results = []; let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const k = i++; results[k] = await fn(items[k]); } }));
  return results;
}

mkdirSync(path.join(ROOT, "evals/results"), { recursive: true });
const summary = [];
for (const version of versions) {
  console.log(`Running ${cases.length} cases on ${version}${judge ? " with grader" : ""}...`);
  const results = await pool(cases, 4, async (c) => {
    try { const r = await runCase(c, version); process.stdout.write("."); return r; }
    catch (e) { process.stdout.write("x"); return { id: c.id, version, error: String(e.message || e) }; }
  });
  console.log("");
  const ok = results.filter((r) => !r.error);
  const allChecks = ok.flatMap((r) => Object.values(r.checks));
  const passRate = allChecks.length ? allChecks.filter(Boolean).length / allChecks.length : 0;
  const casesAllPass = ok.filter((r) => Object.values(r.checks).every(Boolean)).length;
  const avg = (k) => { const v = ok.map((r) => r.judge?.[k]).filter((x) => typeof x === "number"); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
  const row = { version, cases: cases.length, errors: results.length - ok.length, checkPassRate: passRate, casesAllPass, retrievalOk: `${ok.filter((r) => r.topicOk).length}/${ok.filter((r) => r.topicOk !== null).length}`, judge: judge ? Object.fromEntries(["accuracy", "simplicity", "example", "exam", "scope"].map((k) => [k, avg(k)])) : null, avgMs: Math.round(ok.reduce((a, r) => a + r.ms, 0) / (ok.length || 1)), tokensIn: ok.reduce((a, r) => a + (r.usage?.input_tokens || 0) + (r.usage?.cache_read_input_tokens || 0) + (r.usage?.cache_creation_input_tokens || 0), 0), tokensOut: ok.reduce((a, r) => a + (r.usage?.output_tokens || 0), 0), cacheRead: ok.reduce((a, r) => a + (r.usage?.cache_read_input_tokens || 0), 0) };
  summary.push(row);
  writeFileSync(path.join(ROOT, `evals/results/${version}.json`), JSON.stringify({ when: new Date().toISOString(), model: DEFAULT_MODEL, summary: row, results }, null, 1));
  console.log(JSON.stringify(row));
}

const f = (x) => (x == null ? "–" : x.toFixed(2));
const md = [`# Eval results`, ``, `Model: \`${DEFAULT_MODEL}\` · ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC · ${cases.length} cases (see \`evals/cases.json\`)`, ``,
  `| Version | Auto checks passed | Cases fully passing | Right topic retrieved | Accuracy | Simplicity | Example | Exam | Scope | Avg time |`,
  `|---|---|---|---|---|---|---|---|---|---|`,
  ...summary.map((s) => `| ${s.version} | ${Math.round(s.checkPassRate * 100)}% | ${s.casesAllPass}/${s.cases} | ${s.retrievalOk} | ${f(s.judge?.accuracy)} | ${f(s.judge?.simplicity)} | ${f(s.judge?.example)} | ${f(s.judge?.exam)} | ${f(s.judge?.scope)} | ${(s.avgMs / 1000).toFixed(1)} s |`),
  ``, `Grader scores are 1 to 5, given by a grader model that sees the same NOTES as the buddy. Auto checks: six-part structure, length, answer language, required facts, no prompt leak, redirect for off-topic and exam-dump requests, admitting gaps, and feedback on wrong answers.`].join("\n");
writeFileSync(path.join(ROOT, "evals/RESULTS.md"), md + "\n");
console.log("\n" + md);

import { test } from "node:test";
import assert from "node:assert/strict";
import { rankTopics } from "../lib/retrieve.mjs";
import { buildRequest, parseBody, analogyLibrary } from "../lib/buddy.mjs";
import { cards, questions, topics } from "../lib/content.mjs";

test("every topic has one bilingual card with a valid check question", () => {
  assert.equal(cards.length, topics.length);
  for (const c of cards) for (const l of ["en", "sw"]) {
    for (const f of ["line", "simple", "africa", "breaks", "exam"]) assert.ok(c[l][f], `${c.id}.${l}.${f}`);
    assert.ok(c[l].check.options[c[l].check.answer], `${c.id}.${l} answer`);
  }
});

test("question bank answers point at real options", () => {
  for (const q of questions) for (const a of [].concat(q.answer)) assert.ok(q.options[a] !== undefined, q.id);
});

test("retrieval finds the right topic for common questions", () => {
  const cases = { "What is an availability zone?": "2b", "difference between vpn gateway and expressroute": "2p", "IaaS vs PaaS": "1h", "where do I keep secrets like passwords? key vault": "2n", "what does the pricing calculator do": "3b", "Azure Arc for other clouds": "3d", "resource group or subscription": "2c" };
  for (const [q, id] of Object.entries(cases)) assert.equal(rankTopics(q, 1)[0], id, q);
  assert.deepEqual(rankTopics("what is the best pizza in Nairobi"), []);
});

test("parseBody rejects bad input and trims history", () => {
  assert.throws(() => parseBody({ messages: [] }));
  assert.throws(() => parseBody({ messages: [{ role: "system", content: "x" }] }));
  assert.throws(() => parseBody({ messages: [{ role: "user", content: "a" }, { role: "user", content: "b" }] }));
  const many = Array.from({ length: 31 }, (_, i) => ({ role: i % 2 ? "assistant" : "user", content: "hi " + i }));
  const p = parseBody({ lang: "xx", messages: many, topics: ["2b", "nope"] });
  assert.equal(p.lang, "en");
  assert.ok(p.messages.length <= 12);
  assert.equal(p.messages[0].role, "user");
  assert.deepEqual(p.topicHint, ["2b"]);
});

test("v3 request caches the stable prompt and grounds on notes", () => {
  const { params, topicIds } = buildRequest(parseBody({ lang: "sw", messages: [{ role: "user", content: "Availability zone ni nini?" }] }));
  assert.equal(topicIds[0], "2b");
  assert.equal(params.model, "claude-opus-5-5");
  assert.equal(params.system.length, 2);
  assert.deepEqual(params.system[0].cache_control, { type: "ephemeral" });
  assert.match(params.system[0].text, /Answer in Kiswahili/);
  assert.match(params.system[1].text, /NOTES for topic "Availability zones"/);
  assert.ok(!params.system[0].text.includes("{{"));
  assert.ok(analogyLibrary().split("\n").length === cards.length);
});

test("mistake mode adds the practice mistake from the bank", () => {
  const q = questions[0];
  const { params } = buildRequest(parseBody({ messages: [{ role: "user", content: "Why was I wrong?" }], mistake: { questionId: q.id, picked: 0 } }));
  assert.match(params.system[1].text, /PRACTICE MISTAKE/);
  assert.match(params.system[1].text, new RegExp(q.q.slice(0, 20).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

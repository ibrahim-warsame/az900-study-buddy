import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";

let server, port, mode = "ok", lastBody = null, lastAuth = null;

before(async () => {
  server = http.createServer(async (req, res) => {
    let raw = ""; for await (const c of req) raw += c;
    lastBody = JSON.parse(raw); lastAuth = req.headers.authorization;
    if (mode === "429") { res.writeHead(429); return res.end('{"error":"rate"}'); }
    if (mode === "401") { res.writeHead(401); return res.end('{"error":"bad key"}'); }
    if (!lastBody.stream) { res.writeHead(200, { "Content-Type": "application/json" }); return res.end(JSON.stringify({ model: "fake-1", choices: [{ message: { content: "full answer" }, finish_reason: "stop" }], usage: { prompt_tokens: 5, completion_tokens: 2 } })); }
    res.writeHead(200, { "Content-Type": "text/event-stream" });
    for (const part of ["**In one", " line:** ", "zones ", "protect datacenters."]) res.write(`data: ${JSON.stringify({ model: "fake-1", choices: [{ delta: { content: part } }] })}\n\n`);
    res.write(`data: ${JSON.stringify({ choices: [{ delta: {}, finish_reason: "stop" }], usage: { prompt_tokens: 9, completion_tokens: 4 } })}\n\n`);
    res.end("data: [DONE]\n\n");
  });
  await new Promise((r) => server.listen(0, r));
  port = server.address().port;
  process.env.LLM_BASE_URL = `http://127.0.0.1:${port}/v1/`;
  process.env.LLM_API_KEY = "test-key";
  process.env.LLM_MODEL = "fake-model";
  delete process.env.ANTHROPIC_API_KEY;
});
after(() => server.close());

test("health logic picks the compatible provider when only LLM_* is set", async () => {
  const b = await import("../lib/buddy.mjs");
  assert.equal(b.liveProvider(), "compat");
  assert.equal(b.liveModel(), "fake-model");
});

test("streams chunks, sends system prompt + history, hides nothing in the body", async () => {
  mode = "ok";
  const { buildRequest, parseBody, streamAnswer } = await import("../lib/buddy.mjs");
  const { params } = buildRequest(parseBody({ lang: "en", messages: [{ role: "user", content: "What is an availability zone?" }] }));
  const chunks = [];
  const out = await streamAnswer(params, (c) => chunks.push(c));
  assert.equal(chunks.join(""), "**In one line:** zones protect datacenters.");
  assert.equal(out.text, chunks.join(""));
  assert.equal(out.stopReason, "stop");
  assert.equal(lastAuth, "Bearer test-key");
  assert.equal(lastBody.model, "fake-model");
  assert.equal(lastBody.stream, true);
  assert.equal(lastBody.messages[0].role, "system");
  assert.match(lastBody.messages[0].content, /NOTES for topic "Availability zones"/);
  assert.equal(lastBody.messages.at(-1).content, "What is an availability zone?");
  assert.ok(lastBody.max_tokens <= 900);
});

test("non-streaming answer works for the evals", async () => {
  mode = "ok";
  const { answer, buildRequest, parseBody } = await import("../lib/buddy.mjs");
  const { params } = buildRequest(parseBody({ messages: [{ role: "user", content: "IaaS vs PaaS" }] }));
  const out = await answer(params);
  assert.equal(out.text, "full answer");
});

test("provider errors become UpstreamError with the status", async () => {
  const { streamAnswer, buildRequest, parseBody, UpstreamError } = await import("../lib/buddy.mjs");
  const { params } = buildRequest(parseBody({ messages: [{ role: "user", content: "hi" }] }));
  mode = "429";
  await assert.rejects(() => streamAnswer(params, () => {}), (e) => e instanceof UpstreamError && e.status === 429);
  mode = "401";
  await assert.rejects(() => streamAnswer(params, () => {}), (e) => e instanceof UpstreamError && e.status === 401);
});

# Wingu Buddy · unofficial AZ-900 study buddy

> **Unofficial.** Not affiliated with or endorsed by Microsoft. Every question, note and example in this repo is our own, written from the public [AZ-900 skills outline](https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/az-900) and the Microsoft Learn modules. No real exam questions, no Microsoft logos.

*"Wingu" means cloud in Kiswahili.* Wingu Buddy explains Azure in plain words with an example from everyday African life, says exactly what the exam calls it, tells you where the example stops being true, and then checks you understood. It answers in **English, Kiswahili**, and (beta) French and Somali. When there's no internet or no AI credit, it still works from 32 verified offline cards.

Built for the **#1MillionDevs AZ-900 Vibe Coding Hackathon**, challenge: **🤖 AI Study Buddy**.

**Live demo:** https://wingu-buddy.vercel.app · **Demo video:** _link_ · **Pitch deck:** https://canva.link/8z9i7lx67n7p1dx · **Demo script:** [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md)

---

## Why we built this

<!-- TODO (Ibrahim): write this in your own words, 3 to 5 sentences: what happened in your own AZ-900 prep (knowing the idea but answering badly, not remembering the terms, not knowing if you were ready), and why plain words + local examples would have helped. -->

## What it does

| | |
|---|---|
| **Ask** | Ask anything about AZ-900. Every answer has the same six parts: *In one line · Simple explanation · African example · Where the example breaks · On the exam · Your turn*. Answer the "Your turn" question and the buddy tells you if you're right. |
| **Grounded, not guessed** | Each question is matched to our verified notes for that topic (32 topics, 3 exam domains). The model must base facts on those notes and say so when they don't cover something, instead of inventing an answer. |
| **Why was I wrong?** | In Practice, a wrong answer has a button that sends the question, your choice and the right answer to the buddy, which explains why your choice was tempting and why it's wrong. |
| **Works offline** | No key, no credit, or a dropped connection: the app falls back to verified bilingual cards (English and Kiswahili) for the matching topic. |
| **Practice + progress** | 194 practice questions we wrote ourselves, including "choose two". Missed questions come back first. A readiness estimate is weighted by the official domain weights (25–30 / 35–40 / 30–35%). |
| **Light on data** | No framework, no web fonts, no build step. Installable as an app (web manifest). |

## How it works

```
Browser (index.html + assets/app.js)
   │  POST /api/chat  {lang, messages, topic hint, practice mistake}
   ▼
Vercel function (api/chat.js) ── rate limit, input checks, daily cap
   │  lib/retrieve.mjs   keyword retrieval → topic ids
   │  lib/buddy.mjs      system prompt v3 (cached) + NOTES for those topics
   ▼
Claude API (claude-opus-5-5, low effort, streamed back word by word)
```

- **Prompt caching:** the long, stable part of the prompt (rules + analogy library) is cached. Only the per-question notes change, so repeat questions are cheaper and faster.
- **The API key never reaches the browser.** It lives in the server environment (`ANTHROPIC_API_KEY`).
- **Safety fallback:** if a safety check wrongly declines a normal study question, the API retries it on Anthropic's recommended fallback model (`fallbacks: "default"`).

## Prompt engineering

The prompts are in [`prompts/`](prompts) and the reasoning is in [docs/PROMPT_ENGINEERING.md](docs/PROMPT_ENGINEERING.md).

| Version | What changed | Why |
|---|---|---|
| [v1](prompts/system.v1.md) | One line: "friendly tutor, simple terms, African examples" | Baseline |
| [v2](prompts/system.v2.md) | Fixed six-part structure, plain-language rules, length limit, stay on AZ-900 | Answers were long and inconsistent |
| [v3](prompts/system.v3.md) | Grounding in verified NOTES, an analogy library with "where it breaks", exam wording + trap, multilingual rules, answer feedback, mistake explanations, defences against prompt injection and exam-dump requests | The model sometimes invented facts and analogies that led to wrong exam answers |

We test the prompts with [an evaluation set](evals/cases.json) of 24 cases: explanations, comparisons, Kiswahili and French, a learner answering the quiz, a practice mistake, plus traps (off-topic, prompt injection, exam-dump request, a question our notes don't cover). Each answer gets automatic checks and a grader-model score against the same notes. **Results: [evals/RESULTS.md](evals/RESULTS.md).**

## Run it yourself

```bash
git clone https://github.com/ibrahim-warsame/az900-study-buddy
cd az900-study-buddy
npm install
npm test                          # unit tests (no API key needed)
node scripts/dev-server.mjs       # http://localhost:3000 – offline cards only
# live AI: set ANTHROPIC_API_KEY in your environment first, then start the server again
node evals/run.mjs --versions v1,v2,v3 --judge   # runs the evals (costs API credit)
```

Deploy: import the repo in Vercel and add `ANTHROPIC_API_KEY` as an environment variable. Optional: `BUDDY_MODEL`, `RATE_LIMIT_PER_10_MIN` (default 20), `DAILY_LIMIT` (default 400).

## Scaling to more learners and more exams

- **Another certification = new content files.** Topics, cards and questions are plain JSON. AZ-104, AI-900 or a university course can reuse the engine unchanged.
- **Another language = translate the cards.** The prompt already answers in the learner's language, and the cards hold one block per language.
- **Low bandwidth first.** It runs on a cheap phone, and the offline cards cover every topic when data runs out.

## Content and honesty

- Notes and questions were written by us from the public skills outline (updated 20 Jul 2026) and checked against each Microsoft Learn module page. See [docs/CONTENT_SOURCES.md](docs/CONTENT_SOURCES.md).
- Kiswahili cards were written with AI help and checked by us; native-speaker review is welcome (open an issue).
- The readiness figure is an estimate from your practice in this app, not a prediction of your exam score.

## Team and tools

Built by **Ibrahim Warsame** with Claude (Claude Code for building, the Claude API for the buddy). Hosted on Vercel.

MIT licence.

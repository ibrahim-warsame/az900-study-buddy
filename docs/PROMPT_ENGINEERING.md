# Prompt engineering notes

## The problem we are solving
A beginner reads "availability zone" and "region pair", understands both while reading, and still picks the wrong one in the exam. Three things go wrong: the explanation is too abstract, the learner never maps the idea to the exam's own words, and analogies are used without their limits ("a zone is a backup generator", so it must protect against everything).

## Design decisions in v3

| Decision | Where in the prompt | Why |
|---|---|---|
| **Ground every fact in NOTES** passed with each request, and admit gaps | "Facts: where they come from" | A confident wrong answer costs exam points. The notes are verified against Microsoft Learn; the model's memory may be out of date (for example, the TCO calculator was retired). |
| **Retrieval before the call** (`lib/retrieve.mjs`) | code | Only the 1–2 matching topics' notes are sent, so the prompt stays short and focused. Short replies like "Two" fall back to earlier messages for the topic. |
| **Analogy library + "where it breaks"** | "ANALOGY LIBRARY", six-part format | Analogies are reviewed in advance for accuracy and respect. Saying where each one breaks stops the learner from carrying it into a wrong answer. |
| **Fixed six-part structure** | "Format" | Same shape every time: easy to scan on a phone, easy to test automatically, and it always ends with the exam wording and a check question (active recall). |
| **Exam wording + one trap** | "On the exam" | Learners know the idea but lose marks on confusable terms (SET vs ZONE, VPN vs ExpressRoute). |
| **Product names stay in English** in every language | "Format" | The exam uses the English names. |
| **Answer feedback and mistake explanations** | "When the learner answers…", "When the learner got a practice question wrong" | Turns the chat into a learning loop, not a search box. |
| **Scope, exam-dump and injection rules** | "Limits" | Keeps the tool on topic, honest (unofficial), and inside the hackathon rules. Learner text is treated as data, not instructions. |
| **Stable prompt first, volatile notes after the cache breakpoint** | `lib/buddy.mjs` | Prompt caching: the long stable prefix is reused across requests; only the notes change. |
| **Low effort** | `output_config.effort: "low"` | Short tutoring answers do not need deep reasoning; faster and cheaper for a live demo. |

## How we measure
`evals/run.mjs` runs the 24 cases in `evals/cases.json` through the same `buildRequest()` the live app uses, then:
1. **Automatic checks:** six-part structure, length, answer language (Kiswahili/French), required facts present, no prompt leak, redirect on off-topic and exam-dump requests, admitting a gap, feedback when the learner's answer is wrong.
2. **Grader model** (optional `--judge`): scores accuracy against the same NOTES, simplicity, example quality, exam readiness and scope, from 1 to 5.

Results for v1, v2 and v3 side by side: [evals/RESULTS.md](../evals/RESULTS.md).

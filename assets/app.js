// Wingu Buddy front end. No framework, no build step.
const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const store = {
  get(k, d) { try { const v = localStorage.getItem("wb:" + k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem("wb:" + k, JSON.stringify(v)); } catch {} },
};

/* ---------- text in the interface ---------- */
const UI = {
  en: {
    tagline: "Unofficial AZ-900 study buddy", tabAsk: "Ask", tabTopics: "Topics", tabPractice: "Practice", tabProgress: "Progress",
    askLabel: "Ask about any AZ-900 topic", askPh: "Ask about any AZ-900 topic…",
    footer: "Unofficial. Not affiliated with or endorsed by Microsoft. Our own questions and notes, written from the public AZ-900 skills outline. No real exam questions.",
    live: "Live AI", offline: "Offline cards", heroTitle: "Habari! I'm Wingu Buddy.",
    heroText: "Ask me any AZ-900 idea. I explain it in plain words with an example from daily life, tell you what the exam calls it, and check you understood.",
    starters: ["What is cloud computing?", "Availability zones vs region pairs", "IaaS, PaaS or SaaS?", "Why use Azure Key Vault?", "VPN Gateway or ExpressRoute?", "CapEx vs OpEx"],
    simpler: "Simpler, please", another: "Another example", practise: "Practise this", topicsLbl: "Grounded in:",
    offlineBadge: "Offline card", offlineNote: "Live AI isn't available right now, so here is the verified card for this topic.",
    noMatch: "I couldn't match that to an AZ-900 topic. Try one of the topics in the Topics tab.",
    heads: ["In one line", "Simple explanation", "African example", "Where the example breaks", "On the exam", "Your turn"],
    askMore: "Ask Wingu Buddy about this", practiceTopic: "Practise this topic", back: "Back",
    domain: "Domain", ofExam: "of the exam", check: "Check", next: "Next", finish: "Finish",
    correct: "Correct.", notQuite: "Not quite.", whyWrong: "Why was I wrong? Ask Wingu Buddy",
    chooseN: (n) => `Choose ${n}`, mixed: "Mixed: weakest areas first", practiceIntro: "Five questions at a time, written by us in the style of the exam. Wrong answers can be explained by Wingu Buddy.",
    score: (a, b) => `You got ${a} of ${b} right.`, again: "Another round",
    readiness: "Readiness estimate", answered: "questions answered", accuracy: "right on last try", asked: "questions asked to the buddy",
    focus: "Focus next", reset: "Reset progress", resetConfirm: "Reset all progress on this device?",
    progressNote: "An estimate from your practice here, weighted by the official domain weights. Unanswered questions count as zero.",
    mistakeMsg: (q, p) => `I answered "${p}" to: "${q}". Why was I wrong?`,
    simplerMsg: "Explain that again, simpler, with a different everyday example.", anotherMsg: "Give me another African example for the same idea.",
    explainMsg: (t) => `Explain "${t}" for AZ-900.`, langNote: "",
  },
  sw: {
    tagline: "Rafiki wa kusoma AZ-900 (si rasmi)", tabAsk: "Uliza", tabTopics: "Mada", tabPractice: "Mazoezi", tabProgress: "Maendeleo",
    askLabel: "Uliza kuhusu mada yoyote ya AZ-900", askPh: "Uliza kuhusu mada yoyote ya AZ-900…",
    footer: "Si rasmi. Haihusiani na wala haiidhinishwi na Microsoft. Maswali na maelezo ni yetu, yameandikwa kutoka muhtasari wa umma wa ujuzi wa AZ-900. Hakuna maswali halisi ya mtihani.",
    live: "AI hai", offline: "Kadi nje ya mtandao", heroTitle: "Habari! Mimi ni Wingu Buddy.",
    heroText: "Niulize wazo lolote la AZ-900. Nitalieleza kwa maneno rahisi na mfano wa maisha ya kila siku, nikuambie mtihani unaliitaje, na nikague kama umeelewa.",
    starters: ["Kompyuta ya wingu ni nini?", "Availability zones dhidi ya region pairs", "IaaS, PaaS au SaaS?", "Kwa nini Azure Key Vault?", "VPN Gateway au ExpressRoute?", "CapEx dhidi ya OpEx"],
    simpler: "Kwa urahisi zaidi", another: "Mfano mwingine", practise: "Fanya mazoezi", topicsLbl: "Kutoka:",
    offlineBadge: "Kadi nje ya mtandao", offlineNote: "AI hai haipatikani sasa, kwa hiyo hii ni kadi iliyothibitishwa ya mada hii.",
    noMatch: "Sikuweza kuunganisha hilo na mada ya AZ-900. Jaribu mada moja kwenye kichupo cha Mada.",
    heads: ["Kwa sentensi moja", "Maelezo rahisi", "Mfano wa Kiafrika", "Mfano unapoishia", "Kwenye mtihani", "Zamu yako"],
    askMore: "Muulize Wingu Buddy kuhusu hili", practiceTopic: "Fanya mazoezi ya mada hii", back: "Rudi",
    domain: "Eneo", ofExam: "ya mtihani", check: "Kagua", next: "Endelea", finish: "Maliza",
    correct: "Sahihi.", notQuite: "Si sahihi kabisa.", whyWrong: "Kwa nini nimekosea? Muulize Wingu Buddy",
    chooseN: (n) => `Chagua ${n}`, mixed: "Mchanganyiko: maeneo dhaifu kwanza", practiceIntro: "Maswali matano kwa wakati mmoja, tumeyaandika kwa mtindo wa mtihani (kwa Kiingereza, kama mtihani halisi). Wingu Buddy anaweza kueleza majibu yasiyo sahihi.",
    score: (a, b) => `Umepata ${a} kati ya ${b}.`, again: "Raundi nyingine",
    readiness: "Makadirio ya utayari", answered: "maswali yamejibiwa", accuracy: "sahihi kwenye jaribio la mwisho", asked: "maswali kwa rafiki",
    focus: "Zingatia ijayo", reset: "Futa maendeleo", resetConfirm: "Futa maendeleo yote kwenye kifaa hiki?",
    progressNote: "Makadirio kutoka mazoezi yako hapa, yakipimwa kwa uzito rasmi wa maeneo. Maswali ambayo hujajibu yanahesabiwa sifuri.",
    mistakeMsg: (q, p) => `Nilijibu "${p}" kwa swali: "${q}". Kwa nini nimekosea?`,
    simplerMsg: "Eleza tena kwa urahisi zaidi, kwa mfano mwingine wa kila siku.", anotherMsg: "Nipe mfano mwingine wa Kiafrika kwa wazo hilohilo.",
    explainMsg: (t) => `Eleza "${t}" kwa AZ-900.`,
  },
};
UI.fr = { ...UI.en, langNote: "Answers in French come from the live AI (beta). Offline cards are in English." };
UI.so = { ...UI.en, langNote: "Answers in Somali come from the live AI (beta). Offline cards are in English." };

/* ---------- state ---------- */
const S = {
  lang: store.get("lang", (navigator.language || "en").toLowerCase().startsWith("sw") ? "sw" : "en"),
  live: false, history: [], lastTopics: [], busy: false,
  progress: store.get("progress", { answers: {}, asked: 0 }),
  cards: [], topics: [], questions: null,
};
const t = () => UI[S.lang] || UI.en;
const cardLang = (c) => c[S.lang] || c.en;
const WEIGHTS = { 1: 27.5, 2: 37.5, 3: 32.5 };
const DOMAIN_NAMES = { 1: "Cloud concepts", 2: "Azure architecture and services", 3: "Azure management and governance" };

/* ---------- data ---------- */
async function getJson(url) { const r = await fetch(url); if (!r.ok) throw new Error(url); return r.json(); }
async function loadCore() {
  const [d1, d2, d3, topics] = await Promise.all(["content/cards-d1.json", "content/cards-d2.json", "content/cards-d3.json", "content/topics.json"].map(getJson));
  S.cards = [...d1, ...d2, ...d3];
  S.topics = topics;
}
async function loadQuestions() { if (!S.questions) S.questions = await getJson("content/questions.json"); return S.questions; }
const topicOf = (id) => S.topics.find((x) => x.id === id);
const cardOf = (id) => S.cards.find((x) => x.id === id);

/* ---------- client-side retrieval (same idea as the server) ---------- */
const STOP = new Set(["what", "does", "with", "your", "from", "using", "tools", "their", "benefits", "features", "services", "azure", "cloud", "model", "models"]);
const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function rankTopics(text, k = 1) {
  const q = ` ${text.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, " ")} `;
  return S.cards.map((c) => {
    let s = 0;
    for (const kw of c.keywords) if (new RegExp(`\\b${reEsc(kw)}(s|es)?\\b`, "u").test(q)) s += kw.includes(" ") ? 3 : 2;
    for (const w of topicOf(c.topic).title.toLowerCase().split(/[^a-z0-9-]+/).filter((w) => w.length > 3 && !STOP.has(w))) if (q.includes(` ${w}`)) s += 1;
    return { id: c.id, s };
  }).filter((x) => x.s >= 2).sort((a, b) => b.s - a.s).slice(0, k).map((x) => x.id);
}

/* ---------- rendering an answer ---------- */
const PART_CLASS = ["line", "simple", "africa", "breaks", "exam", "turn"];
function inline(s) { return esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>"); }
function renderAnswer(text) {
  const lines = text.replace(/\r/g, "").split("\n");
  const parts = []; let cur = null;
  for (const raw of lines) {
    const line = raw.trim();
    const m = line.match(/^#*\s*\*\*(.+?):?\*\*:?\s*(.*)$/);
    if (m && parts.length < 6 && m[1].length < 40) { cur = { head: m[1].replace(/:$/, ""), body: m[2] ? [m[2]] : [] }; parts.push(cur); }
    else if (line) { if (!cur) { cur = { head: "", body: [] }; parts.push(cur); } cur.body.push(line); }
  }
  let i = 0;
  return parts.map((p) => {
    const cls = p.head ? PART_CLASS[i++] || "" : "";
    return `<div class="part ${cls}">${p.head ? `<strong>${esc(p.head)}</strong>` : ""}${p.body.map((b) => `<p>${inline(b)}</p>`).join("")}</div>`;
  }).join("");
}
function cardMarkdown(card) {
  const c = cardLang(card), h = (UI[S.lang] && card[S.lang] ? UI[S.lang] : UI.en).heads;
  return [c.line, c.simple, c.africa, c.breaks, c.exam, c.check.q].map((v, i) => `**${h[i]}:** ${v}`).join("\n");
}

/* ---------- chat ---------- */
const thread = $("#thread");
function addMsg(role, html) {
  const el = document.createElement("div");
  el.className = `msg ${role}`;
  el.innerHTML = html;
  thread.appendChild(el);
  el.scrollIntoView({ block: "end", behavior: "smooth" });
  return el;
}
function hero() {
  if (thread.children.length) { $("#starters").innerHTML = ""; return; }
  thread.innerHTML = `<div class="hero"><h2>${esc(t().heroTitle)}</h2><p>${esc(t().heroText)}</p>${t().langNote ? `<p class="muted">${esc(t().langNote)}</p>` : ""}</div>`;
  $("#starters").innerHTML = t().starters.map((s) => `<button class="chip" data-start="${esc(s)}">${esc(s)}</button>`).join("");
}

function actionsHTML(topicIds, offline) {
  const chips = topicIds.map((id) => `<button class="chip small topic" data-topic="${id}">${esc(topicOf(id)?.title || id)}</button>`).join("");
  return `<div class="meta">${offline ? `<span class="badge">${esc(t().offlineBadge)}</span>` : ""}${chips ? `<span>${esc(t().topicsLbl)}</span>${chips}` : ""}</div>
    <div class="meta"><button class="chip small" data-act="simpler">${esc(t().simpler)}</button><button class="chip small" data-act="another">${esc(t().another)}</button>${topicIds[0] ? `<button class="chip small" data-practise="${topicIds[0]}">${esc(t().practise)}</button>` : ""}</div>`;
}

function offlineAnswer(el, question, note, mistakeQ, followUp) {
  const ids = mistakeQ ? [] : rankTopics(question, 1);
  let id = ids[0] || (followUp ? S.lastTopics[0] : null);
  if (mistakeQ) id = S.topics.find((x) => x.module === mistakeQ.module)?.id;
  const card = id && cardOf(id);
  let text;
  if (!card) text = t().noMatch;
  else text = (mistakeQ ? `${mistakeQ.explanation}\n` : "") + cardMarkdown(card);
  el.innerHTML = (note ? `<p class="muted">${esc(note)}</p>` : "") + (card ? renderAnswer(text) : `<p>${esc(text)}</p>`) + (card ? actionsHTML([id], true) : "");
  if (card) S.lastTopics = [id];
  S.history.push({ role: "assistant", content: card ? cardMarkdown(card) : text });
}

async function send(text, opts = {}) {
  text = text.trim();
  if (!text || S.busy) return;
  S.busy = true; $(".send").disabled = true;
  if (!thread.querySelector(".msg")) thread.innerHTML = "";
  $("#starters").innerHTML = "";
  addMsg("user", `<p>${esc(text)}</p>`);
  S.history.push({ role: "user", content: text });
  S.progress.asked = (S.progress.asked || 0) + 1; store.set("progress", S.progress);
  const el = addMsg("bot", `<span class="typing" aria-label="Thinking"><i></i><i></i><i></i></span>`);
  const mistakeQ = opts.mistake ? S.questions?.find((q) => q.id === opts.mistake.questionId) : null;

  if (!S.live) { offlineAnswer(el, text, null, mistakeQ, opts.followUp); return done(); }
  try {
    const res = await fetch("/api/chat", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lang: S.lang, messages: S.history.slice(-12), topics: S.lastTopics, mistake: opts.mistake || undefined }),
    });
    if (!res.ok || !res.body) {
      const info = await res.json().catch(() => ({}));
      if (res.status === 503) setLive(false);
      offlineAnswer(el, text, info.message || t().offlineNote, mistakeQ, opts.followUp);
      return done();
    }
    const topicIds = (res.headers.get("X-Buddy-Topics") || "").split(",").filter(Boolean);
    const reader = res.body.getReader(), dec = new TextDecoder();
    let answer = "";
    for (;;) {
      const { value, done: end } = await reader.read();
      if (end) break;
      answer += dec.decode(value, { stream: true });
      el.innerHTML = renderAnswer(answer);
    }
    el.innerHTML = renderAnswer(answer) + actionsHTML(topicIds, false);
    if (topicIds.length) S.lastTopics = topicIds;
    S.history.push({ role: "assistant", content: answer || "…" });
  } catch {
    offlineAnswer(el, text, t().offlineNote, mistakeQ, opts.followUp);
  }
  done();
  function done() { S.busy = false; $(".send").disabled = false; el.scrollIntoView({ block: "end", behavior: "smooth" }); }
}

/* ---------- topics ---------- */
function renderTopics(openId) {
  const v = $("#view-topics");
  if (openId) {
    const card = cardOf(openId), tp = topicOf(openId), c = cardLang(card);
    v.innerHTML = `<button class="btn back" data-back>← ${esc(t().back)}</button>
      <div class="card"><span class="muted"><span class="dot" style="background:var(--d${tp.domain})"></span>${esc(t().domain)} ${tp.domain} · ${esc(tp.weight)} ${esc(t().ofExam)}</span>
      <h2>${esc(tp.title)}</h2><div class="msg bot" style="box-shadow:none">${renderAnswer(cardMarkdown(card))}</div>
      <div class="opts" data-check="${openId}">${c.check.options.map((o, i) => `<button class="opt" data-ci="${i}"><span class="k">${"ABC"[i]}</span><span>${esc(o)}</span></button>`).join("")}</div>
      <div id="checkOut"></div>
      <div class="btns"><button class="btn primary" data-askabout="${openId}">${esc(t().askMore)}</button><button class="btn" data-practise="${openId}">${esc(t().practiceTopic)}</button></div></div>`;
    return;
  }
  v.innerHTML = [1, 2, 3].map((d) => {
    const list = S.topics.filter((x) => x.domain === d);
    return `<div class="card domain"><div class="domhead"><h2><span class="dot" style="background:var(--d${d})"></span>${esc(DOMAIN_NAMES[d])}</h2><span class="muted">${esc(list[0].weight)}</span></div>
      <div class="list">${list.map((x) => `<button class="row" data-open="${x.id}"><span>${esc(x.title)}</span><small>›</small></button>`).join("")}</div></div>`;
  }).join("");
}

/* ---------- practice ---------- */
let P = null;
function pickQuestions(topicId) {
  const qs = S.questions, ans = S.progress.answers;
  let pool = qs;
  if (topicId) { const m = topicOf(topicId).module; pool = qs.filter((q) => q.module === m); }
  const rank = (q) => { const a = ans[q.id]; return a ? (a.last ? 2 : 0) : 1; }; // missed first, then unseen, then known
  return [...pool].sort((a, b) => rank(a) - rank(b) || Math.random() - 0.5).slice(0, 5);
}
async function renderPractice(topicId) {
  if (!S.questions) await loadQuestions();
  const v = $("#view-practice");
  if (topicId !== undefined) { P = { list: pickQuestions(topicId), i: 0, ok: 0, sel: [], done: false, topicId }; }
  if (!P) {
    v.innerHTML = `<div class="card"><h2>${esc(t().tabPractice)}</h2><p class="muted">${esc(t().practiceIntro)}</p>
      <div class="btns"><button class="btn primary" data-start-practice="">${esc(t().mixed)}</button></div>
      ${[1, 2, 3].map((d) => `<div class="btns"><button class="btn" data-start-practice="d${d}"><span class="dot" style="background:var(--d${d})"></span>${esc(t().domain)} ${d}: ${esc(DOMAIN_NAMES[d])}</button></div>`).join("")}</div>`;
    return;
  }
  const q = P.list[P.i];
  if (!q) {
    v.innerHTML = `<div class="card"><h2>${esc(t().score(P.ok, P.list.length))}</h2><div class="btns"><button class="btn primary" data-start-practice="${P.topicId || ""}">${esc(t().again)}</button><button class="btn" data-goto="progress">${esc(t().tabProgress)}</button></div></div>`;
    return;
  }
  const multi = Array.isArray(q.answer), need = multi ? q.answer.length : 1;
  const isRight = (i) => (multi ? q.answer.includes(i) : q.answer === i);
  v.innerHTML = `<div class="card"><span class="muted">${P.i + 1} / ${P.list.length} · ${esc(t().domain)} ${q.domain}${multi ? " · " + esc(t().chooseN(need)) : ""}</span>
    <p class="q">${esc(q.q)}</p>
    <div class="opts">${q.options.map((o, i) => {
      let cls = ""; if (P.done) { if (isRight(i)) cls = "right"; else if (P.sel.includes(i)) cls = "wrong"; }
      return `<button class="opt ${cls}" data-oi="${i}" aria-pressed="${P.sel.includes(i)}" ${P.done ? "disabled" : ""}><span class="k">${"ABCDE"[i]}</span><span>${esc(o)}</span></button>`;
    }).join("")}</div>
    ${P.done ? `<div class="feedback ${P.right ? "" : "no"}"><strong>${esc(P.right ? t().correct : t().notQuite)}</strong> ${esc(q.explanation)}</div>
      <div class="btns">${P.right ? "" : `<button class="btn" data-whywrong="${q.id}">${esc(t().whyWrong)}</button>`}<button class="btn primary" data-next>${esc(P.i === P.list.length - 1 ? t().finish : t().next)}</button></div>`
    : `<div class="btns"><button class="btn primary" data-check-q ${P.sel.length === need ? "" : "disabled"}>${esc(t().check)}</button></div>`}</div>`;
}
function checkQuestion() {
  const q = P.list[P.i], multi = Array.isArray(q.answer);
  P.right = multi ? P.sel.length === q.answer.length && q.answer.every((i) => P.sel.includes(i)) : P.sel[0] === q.answer;
  P.done = true; if (P.right) P.ok++;
  const a = S.progress.answers[q.id] || { n: 0, r: 0 };
  a.n++; if (P.right) a.r++; a.last = P.right; S.progress.answers[q.id] = a;
  store.set("progress", S.progress);
  renderPractice();
}

/* ---------- progress ---------- */
async function renderProgress() {
  if (!S.questions) await loadQuestions();
  const qs = S.questions, ans = S.progress.answers;
  const dom = {};
  for (const d of [1, 2, 3]) {
    const list = qs.filter((q) => q.domain === d), seen = list.filter((q) => ans[q.id]), right = seen.filter((q) => ans[q.id].last);
    dom[d] = { total: list.length, seen: seen.length, right: right.length, score: list.length ? right.length / list.length : 0 };
  }
  const totalW = WEIGHTS[1] + WEIGHTS[2] + WEIGHTS[3];
  const ready = Math.round(([1, 2, 3].reduce((s, d) => s + WEIGHTS[d] * dom[d].score, 0) / totalW) * 100);
  const seen = Object.keys(ans).length, last = Object.values(ans).filter((a) => a.last).length;
  // weakest module = most misses, else least seen
  const byModule = {};
  for (const q of qs) { const m = byModule[q.module] ||= { miss: 0, seen: 0, total: 0 }; m.total++; if (ans[q.id]) { m.seen++; if (!ans[q.id].last) m.miss++; } }
  const weakMod = Object.entries(byModule).sort((a, b) => b[1].miss - a[1].miss || a[1].seen / a[1].total - b[1].seen / b[1].total)[0][0];
  const focusTopic = S.topics.find((x) => x.module === weakMod);
  $("#view-progress").innerHTML = `<div class="card"><span class="muted">${esc(t().readiness)}</span><div class="big">${ready}%</div>
    <div class="meter" role="img" aria-label="${ready}%"><span style="width:${ready}%"></span></div><p class="muted">${esc(t().progressNote)}</p>
    <div class="kpis"><div class="kpi"><b>${seen}</b><span>${esc(t().answered)}</span></div><div class="kpi"><b>${seen ? Math.round((last / seen) * 100) : 0}%</b><span>${esc(t().accuracy)}</span></div><div class="kpi"><b>${S.progress.asked || 0}</b><span>${esc(t().asked)}</span></div></div></div>
    ${[1, 2, 3].map((d) => `<div class="card"><div class="domhead"><h2><span class="dot" style="background:var(--d${d})"></span>${esc(DOMAIN_NAMES[d])}</h2><span class="muted">${WEIGHTS[d]}%</span></div>
      <div class="meter"><span style="width:${Math.round(dom[d].score * 100)}%;background:var(--d${d})"></span></div><span class="muted">${dom[d].right}/${dom[d].total} · ${dom[d].seen} ${esc(t().answered)}</span></div>`).join("")}
    ${focusTopic ? `<div class="card"><span class="muted">${esc(t().focus)}</span><h2>${esc(focusTopic.title)}</h2><div class="btns"><button class="btn primary" data-open-topic="${focusTopic.id}">${esc(t().tabTopics)}</button><button class="btn" data-practise="${focusTopic.id}">${esc(t().practise)}</button></div></div>` : ""}
    <div class="btns"><button class="btn" data-reset>${esc(t().reset)}</button></div>`;
}

/* ---------- navigation and events ---------- */
function show(view) {
  for (const b of document.querySelectorAll(".tabs button")) b.setAttribute("aria-selected", b.dataset.view === view);
  for (const v of ["ask", "topics", "practice", "progress"]) $(`#view-${v}`).hidden = v !== view;
  if (view === "topics") renderTopics();
  if (view === "practice") renderPractice();
  if (view === "progress") renderProgress();
  window.scrollTo({ top: view === "ask" ? document.body.scrollHeight : 0 });
}
function applyLang() {
  document.documentElement.lang = S.lang;
  $("#lang").value = S.lang;
  for (const el of document.querySelectorAll("[data-i18n]")) el.textContent = t()[el.dataset.i18n];
  for (const el of document.querySelectorAll("[data-i18n-ph]")) el.placeholder = t()[el.dataset.i18nPh];
  setLive(S.live);
  hero();
}
function setLive(on) {
  S.live = on;
  const s = $("#status");
  s.textContent = on ? t().live : t().offline;
  s.className = `status ${on ? "live" : "offline"}`;
}

document.addEventListener("click", async (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  if (b.dataset.view) return show(b.dataset.view);
  if (b.dataset.start) return send(b.dataset.start);
  if (b.dataset.act) return send(b.dataset.act === "simpler" ? t().simplerMsg : t().anotherMsg, { followUp: true });
  if (b.dataset.topic || b.dataset.openTopic) { show("topics"); return renderTopics(b.dataset.topic || b.dataset.openTopic); }
  if (b.dataset.open) return renderTopics(b.dataset.open);
  if (b.dataset.back !== undefined) return renderTopics();
  if (b.dataset.askabout) { const tp = topicOf(b.dataset.askabout); S.lastTopics = [tp.id]; show("ask"); return send(t().explainMsg(tp.title), { followUp: true }); }
  if (b.dataset.practise) { show("practice"); return renderPractice(b.dataset.practise); }
  if (b.dataset.startPractice !== undefined) {
    await loadQuestions();
    const v = b.dataset.startPractice;
    if (v.startsWith("d")) { P = { list: [...S.questions].filter((q) => q.domain === +v.slice(1)).sort(() => Math.random() - 0.5).slice(0, 5), i: 0, ok: 0, sel: [], done: false }; return renderPractice(); }
    return renderPractice(v || null);
  }
  if (b.dataset.oi !== undefined && P && !P.done) {
    const i = +b.dataset.oi, q = P.list[P.i], need = Array.isArray(q.answer) ? q.answer.length : 1;
    if (need === 1) P.sel = [i]; else P.sel = P.sel.includes(i) ? P.sel.filter((x) => x !== i) : [...P.sel, i].slice(-need);
    return renderPractice();
  }
  if (b.dataset.checkQ !== undefined) return checkQuestion();
  if (b.dataset.next !== undefined) { P.i++; P.sel = []; P.done = false; return renderPractice(); }
  if (b.dataset.whywrong) {
    const q = S.questions.find((x) => x.id === b.dataset.whywrong), picked = Array.isArray(q.answer) ? P.sel : P.sel[0];
    const pickedText = (Array.isArray(picked) ? picked : [picked]).map((i) => q.options[i]).join(", ");
    show("ask");
    return send(t().mistakeMsg(q.q, pickedText), { mistake: { questionId: q.id, picked } });
  }
  if (b.dataset.goto) return show(b.dataset.goto);
  if (b.dataset.reset !== undefined) { if (confirm(t().resetConfirm)) { S.progress = { answers: {}, asked: 0 }; store.set("progress", S.progress); renderProgress(); } return; }
  const chk = b.closest("[data-check]");
  if (chk && b.dataset.ci !== undefined) {
    const c = cardLang(cardOf(chk.dataset.check)).check, i = +b.dataset.ci;
    chk.querySelectorAll(".opt").forEach((o, k) => { o.disabled = true; if (k === c.answer) o.classList.add("right"); else if (k === i) o.classList.add("wrong"); });
    $("#checkOut").innerHTML = `<div class="feedback ${i === c.answer ? "" : "no"}"><strong>${esc(i === c.answer ? t().correct : t().notQuite)}</strong> ${esc(c.why)}</div>`;
  }
});

$("#ask").addEventListener("submit", (e) => { e.preventDefault(); const q = $("#q"); const v = q.value; q.value = ""; q.style.height = ""; send(v); });
$("#q").addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); $("#ask").requestSubmit(); } });
$("#q").addEventListener("input", (e) => { e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 140) + "px"; });
$("#lang").addEventListener("change", (e) => { S.lang = e.target.value; store.set("lang", S.lang); applyLang(); const open = $("#view-topics"); if (!open.hidden) renderTopics(); if (!$("#view-progress").hidden) renderProgress(); });

(async function start() {
  applyLang();
  try { await loadCore(); } catch { thread.innerHTML = `<p class="muted">Could not load the study cards. Check your connection and reload.</p>`; return; }
  try { const h = await (await fetch("/api/health", { cache: "no-store" })).json(); setLive(!!h.live); } catch { setLive(false); }
})();

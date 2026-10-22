// Loads the verified content packs once per cold start.
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const readText = (p) => readFileSync(path.join(ROOT, p), "utf8");
const readJson = (p) => JSON.parse(readText(p));

export const topics = readJson("content/topics.json");
export const modules = readJson("content/modules.json");
export const questions = readJson("content/questions.json");
export const cards = [
  ...readJson("content/cards-d1.json"),
  ...readJson("content/cards-d2.json"),
  ...readJson("content/cards-d3.json"),
];

export const topicById = new Map(topics.map((t) => [t.id, t]));
export const moduleById = new Map(modules.map((m) => [m.id, m]));
export const cardById = new Map(cards.map((c) => [c.id, c]));
export const questionById = new Map(questions.map((q) => [q.id, q]));

export const LANGUAGES = {
  en: { name: "English", offline: true },
  sw: { name: "Kiswahili", offline: true },
  fr: { name: "French", offline: false },
  so: { name: "Somali", offline: false },
};

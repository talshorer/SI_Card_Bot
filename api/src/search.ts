/**
 * Name search across every kind of object. The index (names, titles and
 * aliases, normalised) is built once when the Worker starts; with a few
 * hundred entries, scoring all of them per request is well under a
 * millisecond.
 */
import { adversaries, boards, cards, scenarios, spirits } from "./data";
import {
  adversaryObject,
  aspectObject,
  boardObject,
  cardObject,
  healingCardObject,
  scenarioObject,
  spiritObject,
} from "./model";

interface Entry {
  name: string;
  terms: string[];
  render: (base: string) => object;
}

/** Lowercase, accents and apostrophes dropped, punctuation to spaces. */
export function normalise(text: string) {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "")
    .replace(/[^\p{L}\p{N}\p{Extended_Pictographic}]+/gu, " ")
    .trim();
}

function levenshtein(a: string, b: string) {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(
        prev[j] + 1,
        row[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = row;
  }
  return prev[b.length];
}

/**
 * Lower is better: exact, then prefix, then a word starting with the
 * query, then substring, then small typos (against the whole term or its
 * opening). Infinity means no match.
 */
function score(term: string, q: string) {
  if (term === q) return 0;
  if (term.startsWith(q)) return 1;
  if (term.split(" ").some((w) => w.startsWith(q))) return 2;
  if (term.includes(q)) return 3;
  const allowed = Math.max(1, Math.floor(q.length / 4));
  const whole = levenshtein(term, q);
  if (whole <= allowed) return 4 + whole;
  // A typo in the opening of a longer term ranks just below the same typo
  // against a whole term.
  const opening = levenshtein(term.slice(0, q.length), q);
  return opening <= allowed ? 4.5 + opening : Infinity;
}

const terms = (...texts: (string | undefined)[]) =>
  [...new Set(texts.filter((t) => t !== undefined).map(normalise))].filter(
    Boolean,
  );

const index: Entry[] = [
  ...spirits.flatMap((s): Entry[] => [
    {
      name: s.name,
      terms: terms(s.name, s.title, ...s.aliases),
      render: (base) => spiritObject(s, base),
    },
    ...s.aspects.map((a) => ({
      name: a.name,
      terms: terms(
        a.name,
        `${s.title} ${a.name}`,
        ...(a.incarna?.aliases ?? []),
      ),
      render: (base: string) => aspectObject(a, s, base),
    })),
    ...(s.healingCards ?? []).map((h) => ({
      name: h.name,
      terms: terms(h.name, h.title),
      render: (base: string) => healingCardObject(h, s, base),
    })),
  ]),
  ...cards.map((c) => ({
    name: c.name,
    terms: terms(c.name, ...(c.aliases ?? [])),
    render: (base: string) => cardObject(c, base),
  })),
  ...adversaries.map((a) => ({
    name: a.name,
    terms: terms(a.name, a.title, ...a.aliases),
    render: (base: string) => adversaryObject(a, base),
  })),
  ...scenarios.map((s) => ({
    name: s.name,
    terms: terms(s.name),
    render: (base: string) => scenarioObject(s, base),
  })),
  ...boards.map((b) => ({
    name: b.name,
    terms: terms(`board ${b.name}`, ...b.aliases),
    render: (base: string) => boardObject(b, base),
  })),
];

export function search(query: string, base: string, limit = 20) {
  const q = normalise(query);
  if (!q) return [];
  return index
    .map((entry) => ({
      entry,
      score: Math.min(...entry.terms.map((t) => score(t, q))),
    }))
    .filter((hit) => hit.score !== Infinity)
    .sort(
      (a, b) => a.score - b.score || a.entry.name.localeCompare(b.entry.name),
    )
    .slice(0, limit)
    .map((hit) => hit.entry.render(base));
}

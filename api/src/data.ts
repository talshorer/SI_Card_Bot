/**
 * The stored data, bundled into the Worker at build time. These types
 * mirror data/schemas/; `npm test` at the repo root validates the files
 * against those schemas, so the casts here are safe.
 */
import spiritsJson from "../../data/spirits.json" with { type: "json" };
import cardsJson from "../../data/cards.json" with { type: "json" };
import adversariesJson from "../../data/adversaries.json" with { type: "json" };
import scenariosJson from "../../data/scenarios.json" with { type: "json" };
import boardsJson from "../../data/boards.json" with { type: "json" };
import commonSchema from "../../data/schemas/common.schema.json" with { type: "json" };
import spiritSchema from "../../data/schemas/spirit.schema.json" with { type: "json" };
import cardSchema from "../../data/schemas/card.schema.json" with { type: "json" };
import adversarySchema from "../../data/schemas/adversary.schema.json" with { type: "json" };
import scenarioSchema from "../../data/schemas/scenario.schema.json" with { type: "json" };
import boardSchema from "../../data/schemas/board.schema.json" with { type: "json" };

export interface Incarna {
  aliases: string[];
  panel: string[];
}

export interface Aspect {
  id: string;
  name: string;
  emote: string;
  panel: string[];
  incarna?: Incarna;
}

export interface HealingCard {
  id: string;
  name: string;
  title: string;
  panel: string[];
}

export interface Spirit {
  id: string;
  name: string;
  title: string;
  set: string;
  complexity: number;
  emote: string;
  aliases: string[];
  uniques: string[];
  panel: string[];
  powerProgression?: string;
  extraPanels?: { name: string; panel: string[] }[];
  incarna?: Incarna;
  healingCards?: HealingCard[];
  aspects: Aspect[];
}

export interface Card {
  id: string;
  name: string;
  type: "unique" | "minor" | "major" | "fear" | "event" | "blight";
  sickSlug: string;
  levels?: string[];
  aliases?: string[];
  stillHealthy?: boolean;
  image?: string;
}

export interface Adversary {
  id: string;
  name: string;
  title: string;
  emote: string;
  aliases: string[];
  flagImage: string;
  panel: string;
  [field: string]: unknown;
}

export interface Scenario {
  id: string;
  name: string;
  difficulty: number;
  panel: string[];
}

export interface Board {
  id: string;
  name: string;
  layout: "standard" | "thematic";
  aliases: string[];
  image: string;
}

export const spirits = spiritsJson as Spirit[];
export const cards = cardsJson as Card[];
export const adversaries = adversariesJson as Adversary[];
export const scenarios = scenariosJson as Scenario[];
export const boards = boardsJson as Board[];

/** Raw collections, as published in the bulk files. */
export const collections = {
  spirits,
  cards,
  adversaries,
  scenarios,
  boards,
} as const;

/** Published at /schemas/v1/<file>, so their relative $refs resolve. */
export const schemas: Record<string, unknown> = {
  "common.schema.json": commonSchema,
  "spirit.schema.json": spiritSchema,
  "card.schema.json": cardSchema,
  "adversary.schema.json": adversarySchema,
  "scenario.schema.json": scenarioSchema,
  "board.schema.json": boardSchema,
};

export const cardsBySlug = new Map(cards.map((c) => [c.sickSlug, c]));

/** The spirit each unique card belongs to, keyed by card sickSlug. */
export const uniqueOwner = new Map(
  spirits.flatMap((s) => s.uniques.map((slug) => [slug, s] as const)),
);

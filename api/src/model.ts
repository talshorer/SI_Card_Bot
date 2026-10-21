/**
 * Turns stored entities into API objects. Every object gets an `object`
 * field naming its kind and a `uri` to fetch it again; links stored in one
 * direction (a spirit's uniques, an aspect's owner) are filled in both.
 * Discord-only fields (emotes, the bot's local flag images) are dropped.
 */
import {
  cardsBySlug,
  uniqueOwner,
  type Adversary,
  type Aspect,
  type Board,
  type Card,
  type HealingCard,
  type Scenario,
  type Spirit,
} from "./data";

const DISCORD_EMOTE = /^<a?:\w+:\d+>$/;

const publicAliases = (aliases: string[] = []) =>
  aliases.filter((a) => !DISCORD_EMOTE.test(a));

// Card images are SICK's; its folders are named per card type.
const SICK_FOLDER: Record<Card["type"], string> = {
  unique: "powers",
  minor: "powers",
  major: "powers",
  fear: "fears",
  event: "events",
  blight: "blights",
};

export const paths = {
  spirit: (id: string) => `/v1/spirits/${id}`,
  aspect: (id: string) => `/v1/aspects/${id}`,
  healingCard: (id: string) => `/v1/healing-cards/${id}`,
  card: (id: string) => `/v1/cards/${id}`,
  adversary: (id: string) => `/v1/adversaries/${id}`,
  scenario: (id: string) => `/v1/scenarios/${id}`,
  board: (id: string) => `/v1/boards/${id}`,
};

/** A short link to another object, used where embedding it would nest. */
const ref = (object: string, id: string, name: string, uri: string) => ({
  object,
  id,
  name,
  uri,
});

export function spiritObject(s: Spirit, base: string) {
  const { emote: _emote, uniques, aspects, healingCards, ...rest } = s;
  return {
    object: "spirit",
    ...rest,
    aliases: publicAliases(rest.aliases),
    uri: base + paths.spirit(s.id),
    uniqueCards: uniques.map((slug) => {
      const card = cardsBySlug.get(slug)!;
      return ref("card", card.id, card.name, base + paths.card(card.id));
    }),
    aspects: aspects.map((a) => aspectObject(a, s, base)),
    ...(healingCards && {
      healingCards: healingCards.map((h) => healingCardObject(h, s, base)),
    }),
  };
}

const spiritRef = (s: Spirit, base: string) =>
  ref("spirit", s.id, s.name, base + paths.spirit(s.id));

export function aspectObject(a: Aspect, owner: Spirit, base: string) {
  const { emote: _emote, ...rest } = a;
  return {
    object: "aspect",
    ...rest,
    uri: base + paths.aspect(a.id),
    spirit: spiritRef(owner, base),
  };
}

export function healingCardObject(h: HealingCard, owner: Spirit, base: string) {
  return {
    object: "healing_card",
    ...h,
    uri: base + paths.healingCard(h.id),
    spirit: spiritRef(owner, base),
  };
}

export function cardObject(c: Card, base: string) {
  const owner = c.type === "unique" ? uniqueOwner.get(c.sickSlug) : undefined;
  // A card with its own image isn't on SICK, so its slug would mislead.
  const { sickSlug: _sickSlug, ...notOnSick } = c;
  return {
    object: "card",
    ...(c.image ? notOnSick : c),
    ...(c.aliases && { aliases: publicAliases(c.aliases) }),
    image:
      c.image ??
      `https://sick.oberien.de/imgs/${SICK_FOLDER[c.type]}/${c.sickSlug}.webp`,
    uri: base + paths.card(c.id),
    ...(owner && { spirit: spiritRef(owner, base) }),
  };
}

export function adversaryObject(a: Adversary, base: string) {
  const { emote: _emote, flagImage: _flagImage, ...rest } = a;
  return {
    object: "adversary",
    ...rest,
    aliases: publicAliases(rest.aliases),
    uri: base + paths.adversary(a.id),
  };
}

export function scenarioObject(s: Scenario, base: string) {
  return { object: "scenario", ...s, uri: base + paths.scenario(s.id) };
}

export function boardObject(b: Board, base: string) {
  return {
    object: "board",
    ...b,
    aliases: publicAliases(b.aliases),
    uri: base + paths.board(b.id),
  };
}

export const list = <T>(data: T[]) => ({
  object: "list",
  total: data.length,
  data,
});

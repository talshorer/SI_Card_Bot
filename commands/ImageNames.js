/*
Card definitions live in data/cards.json (validated against
data/schemas/card.schema.json). This derives the lists of SICK image names
(https://sick.oberien.de) per card type that the search commands match
against. See data/README.md for how to add cards from SICK.
*/
const cards = require("../data/cards.json");

const namesBySlug = new Map(cards.map((card) => [card.sickSlug, card.name]));

// Printed name of the card with the given SICK slug
const cardName = (slug) => namesBySlug.get(slug);

const slugs = (predicate) =>
  cards.filter(predicate).map((card) => card.sickSlug);

const unique = slugs((card) => card.type === "unique");
const minor = slugs((card) => card.type === "minor");
const major = slugs((card) => card.type === "major");
const fear = slugs((card) => card.type === "fear");
const event = slugs((card) => card.type === "event");
const blightedIsland = slugs(
  (card) => card.type === "blight" && !card.stillHealthy,
);
const stillHealthyIsland = slugs(
  (card) => card.type === "blight" && card.stillHealthy,
);

// alias -> event slug, or an array of slugs when events share an alias
const eventAliases = {};
for (const card of cards.filter((c) => c.type === "event" && c.aliases)) {
  for (const alias of card.aliases) {
    eventAliases[alias] =
      alias in eventAliases
        ? [].concat(eventAliases[alias], card.sickSlug)
        : card.sickSlug;
  }
}

exports.cardName = cardName;
exports.unique = unique;
exports.minor = minor;
exports.major = major;
exports.power = [].concat(unique).concat(minor).concat(major);
exports.fear = fear;
exports.event = event;
exports.eventAliases = Object.fromEntries(
  Object.entries(eventAliases).sort(([a], [b]) => a.localeCompare(b)),
);
exports.blightedIsland = blightedIsland;
exports.stillHealthyIsland = stillHealthyIsland;
exports.blight = [].concat(blightedIsland).concat(stillHealthyIsland);

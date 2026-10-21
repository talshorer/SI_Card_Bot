/*
Fear card text (name + Level 1/2/3 effect), vendored from the SICK card
katalog's own data (https://github.com/oberien/spirit-island-card-katalog,
src/db.ts, dual MIT/Apache licensed by its author). SICK itself only ever
renders card images - it never exposes this text on the page - and it isn't
an npm package or a live service to depend on, so this is a point-in-time
snapshot rather than a dependency.

The text now lives on the fear cards in data/cards.json (`name` and
`levels`); slug matches the corresponding entry in ImageNames.fear. To
refresh, pull the `new FearCard(set, FearType.Fear, name, level1, level2,
level3)` entries out of that repo's src/db.ts.
*/
const cards = require("../data/cards.json");

exports.fearCardText = cards
  .filter((card) => card.type === "fear")
  .map((card) => ({
    slug: card.sickSlug,
    name: card.name,
    level1: card.levels[0],
    level2: card.levels[1],
    level3: card.levels[2],
  }));

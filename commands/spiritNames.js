/**
 * Spirit definitions live in data/spirits.json (validated against
 * data/schemas/spirit.schema.json) so they can be shared with other consumers
 * (e.g. a public API), each in the following structure:
 *    {
       id: stable url-safe slug of the spirit name,
       name: full spirit name,
       title: single word the spirit is referred to as
       set: 'base', 'b&c', 'f&f', 'je', 'horizons', 'ni' or unannounced expansion
       complexity: 1, 2, 3 or 4 (low, moderate, high, very high respectively)
       emote: discord emoji id,
       aliases: any cute nicknames, emojis or lore relevant names that the spirit might be referred to as
       uniques: [underscored_unique_names],
       panel: [front_panel_url, back_panel_url],
       powerProgression: (optional) power progression image url
       incarna: (optional) { aliases, panel: [front_url, empowered_url?] }
       healingCards: (optional) [{ id, name, title, panel: [front_url, back_url] }]
       aspects: [{ id: "<spirit id>/<aspect slug>", name, emote, panel: [urls], incarna? }]
   }
 */
const spirits = require("../data/spirits.json");

// Every incarna, whether it belongs to a spirit or to one of its aspects.
// Aspect incarna are named "<spirit name> (<aspect name>)".
const incarna = spirits.flatMap((spirit) => [
  ...(spirit.incarna
    ? [{ id: spirit.id, name: spirit.name, ...spirit.incarna }]
    : []),
  ...spirit.aspects
    .filter((aspect) => aspect.incarna)
    .map((aspect) => ({
      id: aspect.id,
      name: `${spirit.name} (${aspect.name})`,
      ...aspect.incarna,
    })),
]);

const healingCards = spirits.flatMap((spirit) => spirit.healingCards ?? []);

exports.spirits = spirits;
exports.incarna = incarna;
exports.healingCards = healingCards;

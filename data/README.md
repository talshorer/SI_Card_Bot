# Spirit Island data

Game data the bot serves, kept as plain JSON so it can also back a public,
Scryfall-style API. Each collection has a JSON Schema in `schemas/`, and
`npm test` (`tests/data.test.js`) validates the data against it.

| Collection  | Data file          | Schema                          | Loaded by                                   |
| ----------- | ------------------ | ------------------------------- | ------------------------------------------- |
| Spirits     | `spirits.json`     | `schemas/spirit.schema.json`    | `commands/spiritNames.js`                   |
| Cards       | `cards.json`       | `schemas/card.schema.json`      | `commands/ImageNames.js`, `fearCardText.js` |
| Adversaries | `adversaries.json` | `schemas/adversary.schema.json` | `commands/AdversaryNames.js`                |
| Scenarios   | `scenarios.json`   | `schemas/scenario.schema.json`  | `commands/scenarioNames.js`                 |
| Boards      | `boards.json`      | `schemas/board.schema.json`     | `commands/boardNames.js`                    |

Shared types (ids, urls, emotes, panels, set codes) are in
`schemas/common.schema.json`. The loaders turn the data into the lists and
lookups the commands use; the data files are the only place to edit.

## Conventions

- **ids** are lowercase kebab-case slugs of the entity's name
  (`lightnings-swift-strike`) and never change once published, even if the
  name does.
- **Owned entities nest inside their owner** and get a scoped id
  `<owner id>/<slug>`. Something is nested when it belongs to exactly one
  owner and doesn't exist without it: a spirit's aspects, incarna and healing
  cards.
- **Independent entities are referenced by id**: anything shared, or looked
  up in its own right. A spirit's `uniques` point at cards (by SICK slug); an
  adversary rule's `exceptions` point at other adversaries.
- Stored data records each fact once. The API derives the reverse direction
  (e.g. an aspect's `spirit`, a spirit's unique cards) when building responses.
- **`panel`** is always an array of image urls, front first. Single-sided
  things (e.g. the Warrior and Lair incarna) have one entry.
- Strings have no leading or trailing whitespace; unknown fields are rejected.

## Entity map

```
Spirit ──< Aspect ──○ Incarna       (nested)
   ├──○ Incarna                     (nested)
   ├──< Healing card                (nested)
   └──> Card (type: unique)         (by id, via `uniques`)

Card        unique | minor | major | fear | event | blight
Adversary ──< Level ──< Rule ──> Adversary   (exceptions, by id)
Scenario
Board       standard | thematic
```

`──<` many, `──○` zero or one, `──>` reference.

How an adversary level reshapes the Invader deck is code, not data: it lives
in `deckModifications` in `commands/AdversaryNames.js`, keyed by adversary id
and level. The rule text describing it lives in the data.

## Adding cards from SICK

Card images come from [SICK](https://sick.oberien.de), and a card's `sickSlug`
is its image filename there. To find slugs for new cards, search SICK for the
card type (unique, minor, major, events, ...) and run this in the browser
console:

```js
[...document.querySelectorAll(".front img")].map((img) =>
  img.src
    .replace(/.jpg/gi, "")
    .replace(
      /https:\/\/sick.oberien.de\/imgs\/(powers|events|fears|blights)\//gi,
      "",
    ),
);
```

SICK can't filter on blight cards alone, so exclude Blighted Island events by
hand (or search `type:/blighted island$/`).

Printed names and fear card text come from SICK's source data
([`src/db.ts`](https://github.com/oberien/spirit-island-card-katalog/blob/master/src/db.ts),
dual MIT/Apache licensed). A card's `id` is a slug of its printed name.

## Proposed API (v1)

| Endpoint                              | Returns                                            |
| ------------------------------------- | -------------------------------------------------- |
| `/v1/spirits`, `/v1/spirits/:id`      | Spirits, with aspects, incarna and healing cards   |
| `/v1/aspects/:spirit/:aspect`         | One aspect, plus a `spirit` link back to its owner |
| `/v1/cards`, `/v1/cards/:id`          | Cards; filter with `?type=`                        |
| `/v1/adversaries/:id`                 | An adversary with all seven levels                 |
| `/v1/scenarios/:id`, `/v1/boards/:id` | Scenarios, boards                                  |
| `/v1/search?q=`                       | Search across names and aliases                    |
| `/v1/bulk/index.json`                 | Bulk files with `schema_version` and `updated_at`  |
| `/schemas/v1/*.schema.json`           | These schemas, published                           |

Additive changes (new fields, new enum values) stay in `v1`. Renaming or
removing a field, or changing its type, means `v2`.

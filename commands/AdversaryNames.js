/**
 * Adversary definitions live in data/adversaries.json (validated against
 * data/schemas/adversary.schema.json). This file holds what can't be data -
 * how each level reshapes the Invader deck - and turns each definition into
 * the shape the bot's commands use:
 *   title, alias, difficulty[level], fearDeckModification[level],
 *   rules[level] (a rule, or an array of rules), deckModification[level],
 *   with exceptions' `with` naming partner adversaries by title.
 */

const Discord = require("discord.js");
const Deck = require("./Deck.js");
const InvaderDeckCard = require("./InvaderDeckCard.js");
const definitions = require("../data/adversaries.json");

// Invader deck changes per adversary id and level; levels not listed leave
// the deck alone.
// TODO: France's Stage III escalation effects aren't modelled yet
const deckModifications = {
  "habsburg-mining-expedition": {
    // Untapped Salt Deposits: 'Remove the Stage II 'Coastal Lands' card
    // before randomly choosing Stage II cards. Place the 'Salt Deposits' card in
    // place of the 2nd Stage II card.
    // THIS DOES NOT REMOVE THE COASTAL LANDS CARD FOR SCOTLAND DOUBLES
    4: (d) => {
      const indices = d.reduce((acc, card, index) => {
        // gets the indexes of all the non-adversary specific Stage II cards
        if (card.stage === 2 && card.stage == card.cardSymbol) {
          acc.push(index);
        }
        return acc;
      }, []);
      // replaces the 2nd non adversary specific Stage II card with a Salt Deposits card
      d[indices[1]] = new InvaderDeckCard(2, "S");
      return d;
    },
  },
  "the-kingdom-of-brandenburg-prussia": {
    // “Move the bottom-most Stage III card just
    // below the bottom-most Stage I card.”
    2: (d) => {
      // find the index of the bottom most Stage III card
      const bottomStage3Index = d.findLastIndex((card) => card.stage === 3);
      // find the index of the bottom most Stage I card
      const bottomStage1Index = d.findLastIndex((card) => card.stage === 1);
      // pop the bottom most Stage III card off and move it to
      // the index of the bottom most Stage I card + 1
      if (bottomStage3Index == -1) {
        throw new Error("Stage III card not found, cannot apply Prussia 2");
      }
      const stage3Card = d.splice(bottomStage3Index, 1)[0];
      d.splice(bottomStage1Index + 1, 0, stage3Card);
      return d;
    },
    // remove an additional stage I card
    3: (d) => {
      const index = d.findIndex((card) => card.stage === 1);
      if (index != -1) {
        d.splice(index, 1);
      }
      return d;
    },
    // remove an additional stage II card
    4: (d) => {
      const index = d.findIndex((card) => card.stage === 2);
      if (index != -1) {
        d.splice(index, 1);
      }
      return d;
    },
    // remove an additional stage I card
    5: (d) => {
      const index = d.findIndex((card) => card.stage === 1);
      if (index != -1) {
        d.splice(index, 1);
      }
      return d;
    },
    // remove all stage I cards
    6: (d) => {
      let newarr = d.filter((a) => a.stage !== 1);
      return newarr;
    },
  },
  "the-habsburg-monarchy": {
    3: (d) => {
      const index = d.findIndex((card) => card.stage === 1);
      if (index != -1) {
        d.splice(index, 1);
      }
      return d;
    },
  },
  "the-tsardom-of-russia": {
    // Accelerated Exploitation: When making the Invader Deck, put 1 Stage III
    // card after each Stage II card
    4: (d) => {
      const indices = d.reduce((acc, card, index) => {
        if (card.stage === 2) {
          acc.push(index);
        }
        return acc;
      }, []);
      indices.reverse().forEach((index) => {
        d.splice(index + 1, 0, d.pop());
        if (d[d.length - 1].stage !== 3) {
          throw new Error("Bad 3 wasn't found");
        }
      });
      return d;
    },
  },
  "the-kingdom-of-scotland": {
    2: (d) => {
      // gets the indexes of all stage II cards that aren't placed
      // by a specific adversary
      const indices = d.reduce((acc, card, index) => {
        if (card.stage === 2) {
          acc.push(index);
        }
        return acc;
      }, []);
      // replace the 3rd stage II card that ISN'T an adversary specific
      // card with Coastal card
      d[indices[2]] = new InvaderDeckCard(2, "C");
      // then, move the two Stage II cards above it up by one
      d.splice(indices[0] - 1, 0, d.splice(indices[0], 1)[0]);
      d.splice(indices[1] - 1, 0, d.splice(indices[1], 1)[0]);
      return d;
    },
    4: (d) => {
      // replaces the last Stage I card with the bottom Stage III card
      const index = d.findLastIndex((card) => card.stage === 1);
      if (index !== -1) {
        const stage3index = d.findLastIndex((card) => card.stage === 3);
        if (stage3index > -1) {
          // replaces the last Stage I card with the last Stage III card
          d[index] = d.splice(stage3index, 1).shift();
        }
      }
      return d;
    },
  },
};

const titleById = Object.fromEntries(
  definitions.map((definition) => [definition.id, definition.title]),
);

function toBotRule({ phases, exceptions, ...rule }) {
  return {
    ...rule,
    ...(phases && { type: phases }),
    ...(exceptions && {
      exceptions: exceptions.map(({ with: partner, note }) => ({
        with: partner.any
          ? { any: true }
          : { title: titleById[partner.adversary], minLevel: partner.minLevel },
        note,
      })),
    }),
  };
}

function toBotAdversary({
  aliases,
  levels,
  lossCondition,
  escalation,
  ...definition
}) {
  const levelRules = levels.filter((level) => level.rules.length > 0);
  const modifications = deckModifications[definition.id] ?? {};
  return {
    ...definition,
    alias: aliases,
    difficulty: levels.map((level) => level.difficulty),
    deckModification: Object.fromEntries(
      levels.map(({ level }) => [level, modifications[level] ?? ((d) => d)]),
    ),
    fearDeckModification: Object.fromEntries(
      levels.map(({ level, fearCards }) => [level, fearCards]),
    ),
    lossCondition: lossCondition ? toBotRule(lossCondition) : null,
    escalation: toBotRule(escalation),
    rules: Object.fromEntries(
      levelRules.map(({ level, rules }) => [
        level,
        rules.length === 1 ? toBotRule(rules[0]) : rules.map(toBotRule),
      ]),
    ),
  };
}

let ad = new Discord.Collection();
for (const definition of definitions) {
  ad.set(definition.title, toBotAdversary(definition));
}

// Helper: find by token (exact title match first, then alias substring)
function findByToken(token) {
  if (!token) return null;
  const t = token.toLowerCase();
  // exact title match
  for (const [, a] of ad) {
    if ((a.title || "").toLowerCase() === t) return a;
  }
  // alias substring match
  for (const [, a] of ad) {
    if (!Array.isArray(a.alias)) continue;
    for (const alias of a.alias) {
      if (String(alias).toLowerCase().indexOf(t) >= 0) return a;
    }
  }
  return null;
}

// TODO: extract this helper into adversary parsing util
const isValidAdversaryLevel = (adversaryLevel) => {
  return !(isNaN(adversaryLevel) || adversaryLevel < 0 || adversaryLevel > 6);
};

/**
 * parseSetupArgs(args)
 * args: array (e.g. ["prussia","6"] or ["prussia","6","scotland","6"])
 * returns: { leadingAdversary, leadingLevel, supportingAdversary?, supportingLevel? }
 * throws Error on invalid input (caller should catch and report to user)
 * TODO: this should probably be middleware for the relevant Discord layer rather than in AdversaryNames
 * but to be honest the whole project layout needs rethinking if we want to expose the data via
 * API and not assume this is only for Discord
 */
function parseSetupArgs(args) {
  if (!Array.isArray(args)) throw new Error("Invalid arguments");
  if (args.length !== 2 && args.length !== 4) {
    throw new Error(
      "Please specify at least one adversary and a numeric level (/invaderdeck prussia 6) or (/invaderdeck prussia 6 scotland 6).",
    );
  }

  const leadToken = String(args[0]).toLowerCase();
  const leadingLevel = Number.parseInt(args[1]);
  if (!isValidAdversaryLevel(leadingLevel))
    throw new Error(
      "Please specify a numeric level between 0 and 6 for the leading adversary.",
    );

  const leadingAdversary = findByToken(leadToken);
  if (!leadingAdversary)
    throw new Error(
      "Leading adversary not found; try names or nicknames listed in /adversary.",
    );

  let supportingAdversary = null;
  let supportingLevel = null;
  if (args.length === 4) {
    const suppToken = String(args[2]).toLowerCase();
    supportingLevel = Number.parseInt(args[3]);
    if (!isValidAdversaryLevel(supportingLevel))
      throw new Error(
        "Please specify a numeric level between 0 and 6 for the supporting adversary.",
      );

    supportingAdversary = findByToken(suppToken);
    if (!supportingAdversary)
      throw new Error(
        "Supporting adversary not found; try names or nicknames listed in /adversary.",
      );

    if (supportingAdversary.name === leadingAdversary.name)
      throw new Error("Please specify two different adversaries.");
  }

  return {
    leadingAdversary: leadingAdversary,
    leadingLevel: leadingLevel,
    supportingAdversary: supportingAdversary,
    supportingLevel: supportingLevel,
  };
}

/**
 * Compute fear deck counts for given leading/supporting adversaries and levels.
 * Params:
 * - leadingAdversary: adversary object (required)
 * - leadingLevel: integer 0..6 (required)
 * - supportingAdversary: adversary object or null (optional)
 * - supportingLevel: integer 0..6 or null (optional)
 * Returns: array [stageI, stageII, stageIII]
 */
function computeFearDeck(
  leadingAdversary,
  leadingLevel,
  supportingAdversary = null,
  supportingLevel = null,
) {
  if (!leadingAdversary || typeof leadingLevel !== "number") {
    throw new Error("leadingAdversary and leadingLevel are required");
  }

  // base deck
  const base = [3, 3, 3];

  // get modification arrays (validate presence)
  const leadMod = leadingAdversary.fearDeckModification;
  if (!leadMod || !Array.isArray(leadMod[leadingLevel])) {
    throw new Error("Invalid fearDeckModification for leading adversary/level");
  }

  if (supportingAdversary) {
    const suppMod = supportingAdversary.fearDeckModification;
    if (!suppMod || !Array.isArray(suppMod[supportingLevel])) {
      throw new Error(
        "Invalid fearDeckModification for supporting adversary/level",
      );
    }
    return base.map(
      (v, i) => v + leadMod[leadingLevel][i] + suppMod[supportingLevel][i],
    );
  } else {
    return base.map((v, i) => v + leadMod[leadingLevel][i]);
  }
}

/**
 * Compute the invader deck for given leading/supporting adversaries and levels.
 * Params:
 * - leadingAdversary: adversary object (required)
 * - leadingLevel: integer 0..6 (required)
 * - supportingAdversary: adversary object or null (optional)
 * - supportingLevel: integer 0..6 or null (optional)
 * Returns: Deck instance (with .cards array of InvaderDeckCard)
 */
function computeInvaderDeck(
  leadingAdversary,
  leadingLevel,
  supportingAdversary = null,
  supportingLevel = null,
) {
  if (!leadingAdversary || typeof leadingLevel !== "number") {
    throw new Error("leadingAdversary and leadingLevel are required");
  }

  // Start with a fresh deck
  const deck = new Deck();

  // Apply supporting adversary first (if any)
  if (supportingAdversary) {
    for (let lvl = 0; lvl <= supportingLevel; lvl++) {
      if (supportingAdversary.deckModification[lvl]) {
        deck.cards = supportingAdversary.deckModification[lvl](deck.cards);
      }
    }
  }

  // Apply leading adversary second
  for (let lvl = 0; lvl <= leadingLevel; lvl++) {
    if (leadingAdversary.deckModification[lvl]) {
      deck.cards = leadingAdversary.deckModification[lvl](deck.cards);
    }
  }

  // Special-case: Habsburg Livestock reminder card (Level 5+)
  const needsHLCReminder =
    (supportingAdversary &&
      supportingAdversary.title === "habsburg_livestock" &&
      supportingLevel >= 5) ||
    (leadingAdversary &&
      leadingAdversary.title === "habsburg_livestock" &&
      leadingLevel >= 5);

  if (needsHLCReminder) {
    const reminder = new InvaderDeckCard(0, "Wave of Immigration Reminder");
    deck.cards.splice(5, 0, reminder);
  }

  return deck;
}

// A rules[level] entry is normally a single rule object, but can be an array
// of rule objects when one level bundles multiple phase-specific rules (e.g.
// HME's "Avarice Rewarded" has separate Ravage- and Build-Step clauses).
function asRuleArray(entry) {
  return Array.isArray(entry) ? entry : [entry];
}

/**
 * Extract rules for an adversary up to a given difficulty level.
 * Returns array of { index, name, effect, type } sorted by index.
 * type is an array of phases the rule applies to, e.g. ["setup"] or
 * ["setup", "build"]; "ongoing" for passive/always-on or phase-agnostic rules.
 */
function getRulesForAdversary(adversary, maxLevel) {
  if (!adversary || !adversary.rules) return [];

  const applicableIndices = Object.keys(adversary.rules)
    .map(Number)
    .filter((i) => i <= maxLevel);

  // A rule can declare `replaces: <index>` to supersede an earlier rule
  // (e.g. England's "High Immigration (full)" replaces "High Immigration
  // (I)"). Once the replacing rule is active, hide the one it replaces.
  const replacedIndices = new Set(
    applicableIndices.flatMap((i) =>
      asRuleArray(adversary.rules[i])
        .map((r) => r.replaces)
        .filter((r) => r !== undefined),
    ),
  );

  return applicableIndices
    .filter((i) => !replacedIndices.has(i))
    .sort((a, b) => a - b)
    .flatMap((i) =>
      asRuleArray(adversary.rules[i]).map((r) => ({
        index: i,
        name: r.name,
        effect: r.effect,
        type: r.type ?? ["ongoing"],
        exceptions: r.exceptions ?? [],
      })),
    );
}

/**
 * Whether an exception's `with` condition is satisfied by the other
 * adversary in a doubles pairing. `{ any: true }` matches any partner at
 * all (used for exceptions that aren't about one specific adversary);
 * `{ title, minLevel }` matches a specific adversary at or above a level —
 * minLevel: 0 matches that adversary at any level, since every level is >= 0.
 */
function exceptionApplies(withCondition, partnerAdversary, partnerLevel) {
  if (!withCondition) return false;
  if (withCondition.any) return Boolean(partnerAdversary);
  if (!partnerAdversary) return false;
  return (
    partnerAdversary.title === withCondition.title &&
    partnerLevel >= withCondition.minLevel
  );
}

/**
 * Collects doubles-interaction notes ("exceptions") called out on the
 * currently active rules/escalations of both adversaries in a pairing.
 * Each note is anchored on whichever single rule/escalation it's actually
 * about, and declares which *other* adversary (and level) needs to be in
 * play for it to be relevant — so a note only surfaces when both halves of
 * the interaction it describes are actually on the table.
 * Returns [] for a solo (non-doubles) setup, since these are all pairwise.
 * Returns array of { source, note }, in leading-then-supporting rule order.
 */
function getDoublesNotes({
  leadingAdversary,
  leadingLevel,
  leadRules,
  supportingAdversary,
  supportingLevel,
  suppRules,
}) {
  if (!supportingAdversary) return [];

  const notes = [];

  const collect = (entries, partnerAdversary, partnerLevel) => {
    for (const entry of entries) {
      for (const exc of entry.exceptions ?? []) {
        if (exceptionApplies(exc.with, partnerAdversary, partnerLevel)) {
          notes.push({ source: entry.name, note: exc.note });
        }
      }
    }
  };

  collect(leadRules, supportingAdversary, supportingLevel);
  collect(suppRules, leadingAdversary, leadingLevel);
  collect(
    [
      {
        name: leadingAdversary.escalation?.name,
        exceptions: leadingAdversary.escalation?.exceptions,
      },
    ],
    supportingAdversary,
    supportingLevel,
  );
  collect(
    [
      {
        name: supportingAdversary.escalation?.name,
        exceptions: supportingAdversary.escalation?.exceptions,
      },
    ],
    leadingAdversary,
    leadingLevel,
  );

  return notes;
}

/**
 * Returns the loss condition for an adversary, scaling France's "Sprawling
 * Plantations" base pool size when played as part of a doubles game (per its
 * doublesNotes: at France Level 2+, +1 Town per player for each level of the
 * other Adversary). otherLevel is the other adversary's level, or
 * null/omitted when solo.
 */
function getLossCondition(adversary, level, otherLevel = null) {
  if (!adversary || !adversary.lossCondition) return null;

  const { name, effect } = adversary.lossCondition;

  if (
    adversary.title === "france" &&
    level >= 2 &&
    typeof otherLevel === "number"
  ) {
    const scaledPool = 7 + otherLevel;
    return {
      name,
      effect: effect.replace(/\b7\b/, String(scaledPool)),
    };
  }

  return adversary.lossCondition;
}

// Export registry and helpers
// Choice list for the adversary slash command options. `value` is the token
// findByToken() matches on, `name` the full title players see in the picker.
const adversaryChoices = [...ad.values()].map((adversary) => ({
  name: adversary.name,
  value: adversary.title,
}));

module.exports = {
  ad,
  adversaryChoices,
  findByToken,
  isValidAdversaryLevel,
  parseSetupArgs,
  computeFearDeck,
  computeInvaderDeck,
  getRulesForAdversary,
  getLossCondition,
  getDoublesNotes,
};

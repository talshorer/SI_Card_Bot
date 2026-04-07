/**
 * Command that lists all aspects for a given spirit or the entire list.
 */
const { spirits } = require("./spiritNames.js");
const spiritCommand = require("./spirit.js"); // to reuse searchForSpirit

module.exports = {
  name: "aspects",
  description: "Lists all aspects or lists aspects for a given spirit.",
  public: true,
  execute(msg, args) {
    try {
      if (!args || args.length === 0) {
        // list all spirits with aspects
        let out = "Currently, the following spirits have aspects:\n";
        for (const sp of spirits) {
          if (sp && Array.isArray(sp.aspects) && sp.aspects.length > 0) {
            out += `${sp.name} ${sp.emote}: ${formatAspectsList(sp.aspects)}\n`;
          }
        }
        return msg.channel.send(out);
      }

      const input = args.join(" ").trim();

      // Use the same levenshtein-based search as spirit.js
      const possible = spiritCommand.searchForSpirit(input.toLowerCase());

      // If searchForSpirit returns more than one, ask user to be more specific (same behaviour as spirit command)
      if (!Array.isArray(possible) || possible.length !== 1) {
        return msg.channel.send(
          "Multiple spirits matched. Try a more specific string.",
        );
      }

      const spirit = possible[0];

      if (!spirit.aspects || spirit.aspects.length === 0) {
        return msg.channel.send(
          `${spirit.name} (${spirit.emote}) has no aspects.`,
        );
      }
      const out =
        `${spirit.name} (${spirit.emote}) has the following aspects:\n` +
        formatAspectsList(spirit.aspects);
      return msg.channel.send(out);
    } catch (e) {
      console.error(e);
      return msg.channel.send("Error searching for spirit: " + e.toString());
    }
  },
};

function formatAspectsList(aspects = []) {
  if (!Array.isArray(aspects) || aspects.length === 0) return "(no aspects)";
  return aspects.map((a) => `${a.name} (${a.emote})`).join(", ");
}

/**
 * Command that lists every spirit, alphabetically, as a paginated message.
 */
const { spirits } = require("./spiritNames.js");
const { PaginatedMessage } = require("@sapphire/discord.js-utilities");
const { paginationTarget } = require("../utils/interactionMessage.cjs");

const SPIRITS_PER_PAGE = 12;

module.exports = {
  name: "spirits",
  description: "Lists every spirit",
  details:
    "Sends a paginated alphabetical list of every spirit and its emote. Use `/spirit` to look one up.",
  public: true,
  options: [],
  async execute(msg) {
    const sorted = [...spirits].sort((a, b) => a.name.localeCompare(b.name));
    const paginated = new PaginatedMessage();

    for (let i = 0; i < sorted.length; i += SPIRITS_PER_PAGE) {
      const chunk = sorted.slice(i, i + SPIRITS_PER_PAGE);
      paginated.addPageEmbed((embed) =>
        embed
          .setTitle("Spirits")
          .setDescription(chunk.map((s) => `${s.name} ${s.emote}`).join("\n")),
      );
    }

    return paginated.run(paginationTarget(msg));
  },
};

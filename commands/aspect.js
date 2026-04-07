const { getCardName } = require("./sendCardLink.js");
// const { aspects, aspectsNames } = require("./aspectNames.js");

module.exports = {
  name: "aspect",
  description: "Shows cards for a given aspect (by name or emoji).",
  public: true,
  execute(msg, args) {
    if (!args || args.length === 0) {
      msg.channel.send("Usage: aspect <aspect name|emoji> [card number]");
      return;
    }

    // if last arg is a number, use it as card index
    let requestedIndex;
    const last = args[args.length - 1];
    if (!isNaN(last) && last !== "") {
      requestedIndex = parseInt(args.pop(), 10);
    }

    const query = args.join(" ").trim();
    // detect emoji-style input (contains pictograph or starts with '<')
    if (isEmojiQuery(query)) {
      const aspectObj = findAspectByEmoji(query);
      if (!aspectObj) return msg.channel.send("Aspect could not be found");
      sendAspectPanel(msg, aspectObj.panel, requestedIndex);
      return;
    }

    // name search: normalize to lowercase for comparison
    const normalized = query.toLowerCase();
    // quick exact name check against aspectsNames
    if (aspectsNames.some((n) => n.toLowerCase() === normalized)) {
      const aspectObj = findAspectByName(normalized);
      if (!aspectObj) return msg.channel.send("Aspect could not be found");
      sendAspectPanel(msg, aspectObj.panel, requestedIndex);
      return;
    }

    // fallback: try closest spirit match and list its aspects (mirrors original behavior)
    const spirit = getCardName(query, require("./aspectNames.js").spirits);
    const spiritIndex = findSpiritIndex(spirit);
    if (spiritIndex !== null) {
      if (aspects[spiritIndex].length === 1) {
        sendAspectPanel(msg, aspects[spiritIndex][0].panel, requestedIndex);
      } else {
        let out = `${spirit} has the following aspects:\n`;
        out +=
          aspects[spiritIndex].map((a) => `${a.name} (${a.emote})`).join(", ") +
          "\n";
        msg.channel.send(out);
      }
      return;
    }

    msg.channel.send("Aspect could not be found");
  },
};

function isEmojiQuery(q) {
  return /\p{Extended_Pictographic}/u.test(q) || q.charAt(0) === "<";
}

function findAspectByEmoji(emote) {
  for (let i = 0; i < aspects.length; i++) {
    const match = aspects[i].find((a) => a.emote === emote);
    if (match) return match;
  }
  return null;
}

function findAspectByName(lowerName) {
  for (let i = 0; i < aspects.length; i++) {
    for (let j = 0; j < aspects[i].length; j++) {
      if (aspects[i][j].name.toLowerCase() === lowerName) return aspects[i][j];
    }
  }
  return null;
}

function findSpiritIndex(target) {
  const { spirits } = require("./aspectNames.js");
  for (let i = 0; i < spirits.length; i++) if (spirits[i] === target) return i;
  return null;
}

function sendAspectPanel(msg, panel, index) {
  if (!Array.isArray(panel)) {
    msg.channel.send(panel);
    return;
  }
  if (!index || isNaN(index) || index < 1 || index > panel.length) {
    // default to first panel if index invalid
    for (const p of [panel[0]]) msg.channel.send(p);
    return;
  }
  msg.channel.send(panel[index - 1]);
}

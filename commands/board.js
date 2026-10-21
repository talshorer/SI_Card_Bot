// can be used as template
//save as command as commandName.js

const { findBoard } = require("./boardNames.js");

const helpString =
  "Pick a board: a, b, c, d, e, f, g, h, or a thematic board (NE, NW, East, West, SE, SW).";

module.exports = {
  name: "board",
  description: "Displays Boards",
  details:
    "Returns the map image for a board - core boards a-h, or a directional/thematic board (NE, NW, East, West, SE, SW). Run it without picking a board to see the full list.",
  public: true, //has to be true to show as a command
  options: [
    {
      name: "board",
      description: "Which board to show (blank lists the valid inputs)",
      type: "string",
      choices: [
        { name: "A", value: "a" },
        { name: "B", value: "b" },
        { name: "C", value: "c" },
        { name: "D", value: "d" },
        { name: "E", value: "e" },
        { name: "F", value: "f" },
        { name: "G", value: "g" },
        { name: "H", value: "h" },
        { name: "North East (thematic)", value: "ne" },
        { name: "North West (thematic)", value: "nw" },
        { name: "East (thematic)", value: "east" },
        { name: "West (thematic)", value: "west" },
        { name: "South East (thematic)", value: "se" },
        { name: "South West (thematic)", value: "sw" },
      ],
    },
  ],
  async execute(msg, args) {
    if (args[0] == "help" || args[0] == "") {
      await msg.channel.send(helpString);
    } else {
      await msg.channel.send(searchBoards(args[0]));
    }
  },
};

/**
 * Returns the image for the board matching the given id or alias, or the
 * help text if there's no match.
 * @param {*} b
 * @returns
 */
function searchBoards(b) {
  if (!b) return helpString;
  const board = findBoard(b);
  return board ? board.image : helpString;
}

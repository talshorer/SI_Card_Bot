// endpoint to retrieve an incarna
const { incarna: allIncarna } = require("./spiritNames.js");
const getcardname = require("./sendCardLink.js").getCardName;

// single-sided incarna (e.g. Warrior, Lair) only have a front
function getPanel(incarna, side) {
  return side == "front"
    ? incarna.panel[0]
    : (incarna.panel[1] ?? incarna.panel[0]);
}

module.exports = {
  name: "incarna",
  description: "Get an incarna",
  details:
    "Returns a spirit's Incarna card panel image - the unempowered (front) side by default, or the empowered side via the `side` option.",
  public: true,
  options: [
    {
      name: "spirit",
      description: "Spirit whose incarna to show",
      type: "string",
      required: true,
      choices: allIncarna.map((card) => ({
        name: card.name,
        value: card.name,
      })),
    },
    {
      name: "side",
      description: "Unempowered (front) or empowered (back); defaults to front",
      type: "string",
      choices: [
        { name: "Front", value: "front" },
        { name: "Back", value: "back" },
      ],
    },
  ],
  async execute(msg, args) {
    var panel = "Please name a spirit with an incarna.";
    var found = false;
    var list = [];

    if (args.length != 0) {
      const searchString = args[0].toLowerCase();
      // if there's no second argument provided, assume they want the unempowered side
      const side = args.length > 1 ? args[1] : "front";
      for (const incarna of allIncarna) {
        // direct match
        if (incarna.name.toLowerCase().indexOf(searchString) >= 0) {
          panel = getPanel(incarna, side);
        }
        // alias
        else {
          for (const alias of incarna.aliases) {
            if (alias.toLowerCase().indexOf(searchString) >= 0) {
              panel = getPanel(incarna, side);
            }
          }
        }
      }
    }

    msg.channel.send(panel);
  },
};

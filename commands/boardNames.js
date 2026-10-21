// Board definitions live in data/boards.json (validated against
// data/schemas/board.schema.json).
const boards = require("../data/boards.json");

/**
 * Returns the board whose id or one of whose aliases matches the given
 * term (case-insensitive), or undefined.
 */
function findBoard(term) {
  const t = String(term).toLowerCase();
  return boards.find((board) => board.id === t || board.aliases.includes(t));
}

exports.regularBoards = boards.filter((board) => board.layout === "standard");
exports.thematicBoards = boards.filter((board) => board.layout === "thematic");
exports.allBoards = boards;
exports.findBoard = findBoard;

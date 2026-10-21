// Scenario definitions live in data/scenarios.json (validated against
// data/schemas/scenario.schema.json); panel is [front, back].
const scenario = require("../data/scenarios.json");

exports.scenario = scenario;

// Choice list for the /scenario slash command; scenario names are short and
// few enough to offer as a picker rather than a free-text search.
exports.scenarioChoices = scenario.map((s) => ({
  name: s.name,
  value: s.name,
}));

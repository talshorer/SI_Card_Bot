/**
 * Public Spirit Island data API (v1), served from a Cloudflare Worker.
 *
 * The data in data/ is bundled in at build time, so every response comes
 * from memory and a deploy is the only way it changes. Images are links to
 * the R2 bucket (panels) or SICK (cards); the Worker never serves them.
 */
import { Hono, type Context } from "hono";
import { cors } from "hono/cors";
import { etag } from "hono/etag";
import {
  adversaries,
  boards,
  cards,
  collections,
  scenarios,
  schemas,
  spirits,
} from "./data";
import {
  adversaryObject,
  aspectObject,
  boardObject,
  cardObject,
  healingCardObject,
  list,
  scenarioObject,
  spiritObject,
} from "./model";
import { search } from "./search";

type Env = { Bindings: { GIT_SHA?: string; UPDATED_AT?: string } };

const app = new Hono<Env>();

app.use("*", cors());
app.use("*", etag());
app.use("*", async (c, next) => {
  await next();
  if (c.res.ok) c.header("Cache-Control", "public, max-age=300");
});

const base = (c: Context) => new URL(c.req.url).origin;

const notFound = (c: Context, details: string) =>
  c.json({ object: "error", status: 404, code: "not_found", details }, 404);

/** Responds with the entity's API object, or a 404 naming what's missing. */
function one<T>(
  c: Context,
  kind: string,
  found: T | undefined,
  render: (x: T, base: string) => object,
) {
  return found === undefined
    ? notFound(c, `No ${kind} with id '${c.req.path.split("/v1/")[1]}'`)
    : c.json(render(found, base(c)));
}

app.get("/", (c) =>
  c.json({
    object: "api",
    version: "v1",
    commit: c.env?.GIT_SHA ?? "dev",
    endpoints: [
      "/v1/spirits",
      "/v1/spirits/:id",
      "/v1/aspects",
      "/v1/aspects/:spirit/:aspect",
      "/v1/healing-cards/:spirit/:card",
      "/v1/cards?type=",
      "/v1/cards/:id",
      "/v1/adversaries",
      "/v1/adversaries/:id",
      "/v1/scenarios",
      "/v1/scenarios/:id",
      "/v1/boards?layout=",
      "/v1/boards/:id",
      "/v1/search?q=",
      "/v1/bulk/index.json",
      "/schemas/v1/:file",
    ].map((path) => base(c) + path),
  }),
);

app.get("/v1/spirits", (c) => {
  const set = c.req.query("set");
  const hits = set ? spirits.filter((s) => s.set === set) : spirits;
  return c.json(list(hits.map((s) => spiritObject(s, base(c)))));
});
app.get("/v1/spirits/:id", (c) =>
  one(
    c,
    "spirit",
    spirits.find((s) => s.id === c.req.param("id")),
    spiritObject,
  ),
);

app.get("/v1/aspects", (c) =>
  c.json(
    list(
      spirits.flatMap((s) => s.aspects.map((a) => aspectObject(a, s, base(c)))),
    ),
  ),
);
app.get("/v1/aspects/:spirit/:aspect", (c) => {
  const owner = spirits.find((s) => s.id === c.req.param("spirit"));
  const id = `${c.req.param("spirit")}/${c.req.param("aspect")}`;
  const aspect = owner?.aspects.find((a) => a.id === id);
  return one(c, "aspect", aspect, (a, b) => aspectObject(a, owner!, b));
});

app.get("/v1/healing-cards/:spirit/:card", (c) => {
  const owner = spirits.find((s) => s.id === c.req.param("spirit"));
  const id = `${c.req.param("spirit")}/${c.req.param("card")}`;
  const card = owner?.healingCards?.find((h) => h.id === id);
  return one(c, "healing card", card, (h, b) =>
    healingCardObject(h, owner!, b),
  );
});

app.get("/v1/cards", (c) => {
  const type = c.req.query("type");
  const hits = type ? cards.filter((x) => x.type === type) : cards;
  return c.json(list(hits.map((x) => cardObject(x, base(c)))));
});
app.get("/v1/cards/:id", (c) =>
  one(
    c,
    "card",
    cards.find((x) => x.id === c.req.param("id")),
    cardObject,
  ),
);

app.get("/v1/adversaries", (c) =>
  c.json(list(adversaries.map((a) => adversaryObject(a, base(c))))),
);
app.get("/v1/adversaries/:id", (c) =>
  one(
    c,
    "adversary",
    adversaries.find((a) => a.id === c.req.param("id")),
    adversaryObject,
  ),
);

app.get("/v1/scenarios", (c) =>
  c.json(list(scenarios.map((s) => scenarioObject(s, base(c))))),
);
app.get("/v1/scenarios/:id", (c) =>
  one(
    c,
    "scenario",
    scenarios.find((s) => s.id === c.req.param("id")),
    scenarioObject,
  ),
);

app.get("/v1/boards", (c) => {
  const layout = c.req.query("layout");
  const hits = layout ? boards.filter((b) => b.layout === layout) : boards;
  return c.json(list(hits.map((b) => boardObject(b, base(c)))));
});
app.get("/v1/boards/:id", (c) =>
  one(
    c,
    "board",
    boards.find((b) => b.id === c.req.param("id")),
    boardObject,
  ),
);

app.get("/v1/search", (c) => {
  const q = c.req.query("q") ?? "";
  if (!q.trim()) {
    return c.json(
      {
        object: "error",
        status: 400,
        code: "bad_request",
        details: "Missing ?q=",
      },
      400,
    );
  }
  const limit = Math.min(Number(c.req.query("limit")) || 20, 100);
  return c.json(list(search(q, base(c), limit)));
});

// Bulk files are the stored data exactly as in data/, so they validate
// against the published schemas.
const SCHEMA_FOR: Record<keyof typeof collections, string> = {
  spirits: "spirit.schema.json",
  cards: "card.schema.json",
  adversaries: "adversary.schema.json",
  scenarios: "scenario.schema.json",
  boards: "board.schema.json",
};

app.get("/v1/bulk/index.json", (c) =>
  c.json(
    list(
      Object.entries(collections).map(([type, data]) => ({
        object: "bulk_data",
        type,
        count: data.length,
        uri: `${base(c)}/v1/bulk/${type}.json`,
        schema: `${base(c)}/schemas/v1/${SCHEMA_FOR[type as keyof typeof collections]}`,
        schemaVersion: "v1",
        commit: c.env?.GIT_SHA ?? "dev",
        updatedAt: c.env?.UPDATED_AT || null,
      })),
    ),
  ),
);
app.get("/v1/bulk/:file", (c) => {
  const type = c.req.param("file").replace(/\.json$/, "");
  return type in collections
    ? c.json(collections[type as keyof typeof collections])
    : notFound(c, `No bulk file '${c.req.param("file")}'`);
});

app.get("/schemas/v1/:file", (c) => {
  const schema = schemas[c.req.param("file")];
  return schema
    ? c.json(schema, 200, { "Content-Type": "application/schema+json" })
    : notFound(c, `No schema '${c.req.param("file")}'`);
});

app.notFound((c) => notFound(c, `No route for ${c.req.path}`));
app.onError((err, c) => {
  console.error(err);
  return c.json(
    {
      object: "error",
      status: 500,
      code: "internal_error",
      details: "Something went wrong",
    },
    500,
  );
});

export default app;

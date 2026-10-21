import { describe, it } from "node:test";
import assert from "node:assert/strict";
import app from "../src/index";
import { spirits } from "../src/data";

const BASE = "http://api.test";

async function get(path: string) {
  const res = await app.request(BASE + path);
  return { status: res.status, headers: res.headers, body: await res.json() };
}

describe("spirits", () => {
  it("lists every spirit", async () => {
    const { body } = await get("/v1/spirits");
    assert.equal(body.object, "list");
    assert.equal(body.total, spirits.length);
  });

  it("filters by set", async () => {
    const { body } = await get("/v1/spirits?set=horizons");
    assert.equal(body.total, 5);
    assert.ok(body.data.every((s: { set: string }) => s.set === "horizons"));
  });

  it("links a spirit's unique cards and aspects both ways", async () => {
    const { body } = await get("/v1/spirits/thunderspeaker");
    assert.equal(body.object, "spirit");
    assert.equal(body.uri, `${BASE}/v1/spirits/thunderspeaker`);
    assert.equal(body.emote, undefined);
    assert.equal(body.uniqueCards.length, 4);
    const card = await get(new URL(body.uniqueCards[0].uri).pathname);
    assert.equal(card.body.spirit.id, "thunderspeaker");
    const warrior = body.aspects.find(
      (a: { name: string }) => a.name === "Warrior",
    );
    assert.equal(warrior.spirit.id, "thunderspeaker");
    assert.equal(
      (await get(new URL(warrior.uri).pathname)).body.id,
      warrior.id,
    );
  });

  it("resolves every unique card reference", async () => {
    const { body } = await get("/v1/spirits");
    for (const s of body.data) {
      assert.ok(
        s.uniqueCards.every((c: object | undefined) => c),
        s.id,
      );
    }
  });
});

describe("cards", () => {
  it("filters by type and links the SICK image", async () => {
    const { body } = await get("/v1/cards?type=fear");
    assert.ok(body.total > 0);
    assert.ok(body.data.every((c: { type: string }) => c.type === "fear"));
    assert.match(
      body.data[0].image,
      /^https:\/\/sick\.oberien\.de\/imgs\/fears\/\w+\.webp$/,
    );
  });
});

describe("apocrypha", () => {
  it("serves a spirit's extra panels and its uniques' own images", async () => {
    const { body } = await get("/v1/spirits/covets-gleaming-shards-of-earth");
    assert.equal(body.set, "apocrypha");
    assert.equal(body.extraPanels[0].name, "The Gleaming Hoard");
    const card = await get(new URL(body.uniqueCards[0].uri).pathname);
    assert.match(
      card.body.image,
      /^https:\/\/cdn\.callofthedahanways\.com\/cards\//,
    );
    assert.equal(card.body.sickSlug, undefined);
    assert.equal(card.body.spirit.id, "covets-gleaming-shards-of-earth");
  });
});

describe("healing cards", () => {
  it("returns a healing card with its spirit", async () => {
    const { body } = await get(
      "/v1/healing-cards/wounded-waters-bleeding/serene-waters",
    );
    assert.equal(body.object, "healing_card");
    assert.equal(body.spirit.id, "wounded-waters-bleeding");
  });
});

describe("adversaries", () => {
  it("drops Discord-only fields", async () => {
    const { body } = await get(
      "/v1/adversaries/the-kingdom-of-brandenburg-prussia",
    );
    assert.equal(body.emote, undefined);
    assert.equal(body.flagImage, undefined);
    assert.ok(body.aliases.every((a: string) => !a.startsWith("<:")));
    assert.equal(body.levels.length, 7);
  });
});

describe("search", () => {
  const first = async (q: string) =>
    (await get(`/v1/search?q=${encodeURIComponent(q)}`)).body.data[0];

  it("matches names, aliases and typos", async () => {
    assert.equal((await first("lightning")).id, "lightnings-swift-strike");
    assert.equal((await first("bodan")).id, "bringer-of-dreams-and-nightmares");
    assert.equal((await first("thunderspeeker")).id, "thunderspeaker");
    assert.equal(
      (await first("prussia")).id,
      "the-kingdom-of-brandenburg-prussia",
    );
  });

  it("rejects an empty query", async () => {
    assert.equal((await get("/v1/search?q=")).status, 400);
  });
});

describe("bulk and schemas", () => {
  it("serves bulk files that link their schema", async () => {
    const { body } = await get("/v1/bulk/index.json");
    const entry = body.data.find((d: { type: string }) => d.type === "spirits");
    const bulk = await get(new URL(entry.uri).pathname);
    assert.deepEqual(bulk.body, spirits);
    const schema = await get(new URL(entry.schema).pathname);
    assert.equal(schema.status, 200);
    assert.equal(schema.headers.get("content-type"), "application/schema+json");
  });
});

describe("errors", () => {
  it("returns a JSON 404 for unknown ids and routes", async () => {
    for (const path of ["/v1/spirits/nope", "/v1/nope"]) {
      const { status, body } = await get(path);
      assert.equal(status, 404);
      assert.equal(body.object, "error");
    }
  });
});

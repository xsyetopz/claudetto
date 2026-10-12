// Behavior of the settings snippet of `tools/generate/` (workflow, "Settings snippet"), on the fixture slices of `fixture/`.
// Each test works in its own copy of the fixture under `TMPDIR`, with a small settings schema in its root.

import { expect, test } from "bun:test";
import { discover } from "../../../tools/generate/discover.ts";
import { snippetOf } from "../../../tools/generate/emit/snippet.ts";
import { fixtureRoot } from "./fixture.ts";

type Json = Record<string, unknown>;

/** The settings snippet of the fixture plugin `p` of `dir`, or `null` when no slice of it has settings. */
const snippetFor = async (dir: string): Promise<Json | null> => {
  const plugin = (await discover(dir)).find((p) => p.name === "p");
  if (!plugin) throw new Error("the fixture has no plugin p");
  return snippetOf(dir, plugin);
};

/** The top-level keys of the schema of the fixture, in the order that the snippet follows. */
const ORDER = ["permissions", "model", "env", "outputStyle", "sandbox"];

/** A settings schema whose top-level properties are in the order `keys`. */
const schemaWith = (keys: string[]): string =>
  JSON.stringify({
    properties: Object.fromEntries(keys.map((k) => [k, {}])),
  });

/** The source of a fixture slice `name` whose `settings` entry is the object literal `settings`. */
const sliceWith = (name: string, settings: string): string =>
  `export const slice = { name: "${name}", settings: ${settings} };\n`;

/** The fixture root with the schema `ORDER` and the two slices `gamma` and `delta` with the settings of each. */
const twoSlices = (gamma: string, delta: string): Promise<string> =>
  fixtureRoot({
    "schemas/claude-code-settings.json": schemaWith(ORDER),
    "src/plugins/p/slices/gamma/slice.ts": sliceWith("gamma", gamma),
    "src/plugins/p/slices/delta/slice.ts": sliceWith("delta", delta),
  });

test("the snippet lists its top-level keys in the property order of the schema", async () => {
  const dir = await twoSlices(
    `{ sandbox: { network: {} }, model: "m", permissions: {} }`,
    `{ outputStyle: "x", env: { A: "1" } }`,
  );
  const json = await snippetFor(dir);
  expect(Object.keys(json ?? {})).toStrictEqual([
    "permissions",
    "model",
    "env",
    "outputStyle",
    "sandbox",
  ]);
});

test("the keys of `env` in the snippet are in alphabetical order, across the slices", async () => {
  const dir = await twoSlices(
    `{ env: { ZETA: "1", ALPHA: "2" } }`,
    `{ env: { MID: "3" } }`,
  );
  const env = (await snippetFor(dir))?.["env"] as Json;
  expect(Object.keys(env)).toStrictEqual(["ALPHA", "MID", "ZETA"]);
});

test("two slices that set one key to different values are an error that names both slices", async () => {
  const dir = await twoSlices(`{ model: "a" }`, `{ model: "b" }`);
  const message = await snippetFor(dir).then(
    () => "",
    (e: Error) => e.message,
  );
  expect(message).toContain("gamma");
  expect(message).toContain("delta");
});

test("two slices that set one key to one value are not an error", async () => {
  const dir = await twoSlices(`{ model: "a" }`, `{ model: "a" }`);
  expect((await snippetFor(dir))?.["model"]).toBe("a");
});

test("the nested objects of two slices merge by key, and a leaf that two slices set differently is an error", async () => {
  const dir = await twoSlices(
    `{ sandbox: { network: { allowedDomains: ["a.dev"] } } }`,
    `{ sandbox: { filesystem: { allowWrite: ["/tmp"] } } }`,
  );
  expect((await snippetFor(dir))?.["sandbox"]).toStrictEqual({
    network: { allowedDomains: ["a.dev"] },
    filesystem: { allowWrite: ["/tmp"] },
  });
  const clash = await twoSlices(
    `{ sandbox: { network: { allowedDomains: ["a.dev"] } } }`,
    `{ sandbox: { network: { allowedDomains: ["b.dev"] } } }`,
  );
  await expect(snippetFor(clash)).rejects.toThrow(/gamma/);
});

test("a plugin whose slices have no `settings` entry has no snippet", async () => {
  expect(await snippetFor(await fixtureRoot())).toBeNull();
});

// Behavior of the settings snippet of `tools/generate/` (workflow, "Settings snippet"), on the fixture slices of `fixture/`.
// Each test works in its own copy of the fixture under `TMPDIR`, with a small settings schema in its root.

import { expect, test } from "bun:test";
import type { Output } from "../../../tools/generate/emit/texts.ts";
import { generated } from "../../../tools/generate/outputs.ts";
import { fixtureRoot, textOf } from "./fixture.ts";

const SNIPPET = "plugins/p/settings-snippet.json";

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
  const json = JSON.parse(textOf(await generated(dir), SNIPPET));
  expect(Object.keys(json)).toStrictEqual([
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
  const json = JSON.parse(textOf(await generated(dir), SNIPPET));
  expect(Object.keys(json.env)).toStrictEqual(["ALPHA", "MID", "ZETA"]);
});

test("two slices that set one key to different values are an error that names both slices", async () => {
  const dir = await twoSlices(`{ model: "a" }`, `{ model: "b" }`);
  const message = await generated(dir).then(
    () => "",
    (e: Error) => e.message,
  );
  expect(message).toContain("gamma");
  expect(message).toContain("delta");
});

test("two slices that set one key to one value are not an error", async () => {
  const dir = await twoSlices(`{ model: "a" }`, `{ model: "a" }`);
  const json = JSON.parse(textOf(await generated(dir), SNIPPET));
  expect(json.model).toBe("a");
});

test("the nested objects of two slices merge by key, and a leaf that two slices set differently is an error", async () => {
  const dir = await twoSlices(
    `{ sandbox: { network: { allowedDomains: ["a.dev"] } } }`,
    `{ sandbox: { filesystem: { allowWrite: ["/tmp"] } } }`,
  );
  const json = JSON.parse(textOf(await generated(dir), SNIPPET));
  expect(json.sandbox).toStrictEqual({
    network: { allowedDomains: ["a.dev"] },
    filesystem: { allowWrite: ["/tmp"] },
  });
  const clash = await twoSlices(
    `{ sandbox: { network: { allowedDomains: ["a.dev"] } } }`,
    `{ sandbox: { network: { allowedDomains: ["b.dev"] } } }`,
  );
  await expect(generated(clash)).rejects.toThrow(/gamma/);
});

test("a plugin whose slices have no `settings` entry gives no snippet file", async () => {
  const made: Output[] = await generated(await fixtureRoot());
  expect(made.some((o) => o.file === SNIPPET)).toBeFalse();
});

// The `extends` merge of `jscpd-config`: the rules of `merge`, and the CLI on files in a temp folder.

import { expect, test } from "bun:test";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { main } from "../../../plugins/claudetto/slices/dry/adapters/cli.ts";
import { merge } from "../../../plugins/claudetto/slices/dry/merge.ts";

/** Writes `files` (name to JSON) in a new folder, runs `jscpd-config` on `local.json`, and returns the exit code, the merged config, and the errors. */
const run = async (files: Record<string, object>) => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "dry-"));
  for (const [name, json] of Object.entries(files))
    await Bun.write(path.join(dir, name), JSON.stringify(json));
  const out = path.join(dir, "out.json");
  const errors: string[] = [];
  const io = { log: () => {}, error: (m: string) => errors.push(m) };
  const code = await main(
    ["--local", path.join(dir, "local.json"), "--out", out],
    io,
  );
  const config = (await Bun.file(out).exists())
    ? await Bun.file(out).json()
    : undefined;
  return { code, config, errors: errors.join("\n") };
};

test("`merge` merges objects deeply and replaces other values", () => {
  expect(
    merge({ a: { b: 1, c: 2 }, d: [1] }, { a: { c: 3 }, d: [2], e: 4 }),
  ).toStrictEqual({ a: { b: 1, c: 3 }, d: [2], e: 4 });
});

test("`merge` appends the `ignore` lists without a duplicate", () => {
  expect(
    merge(
      { ignore: ["a", "b"], ignorePattern: ["x"] },
      { ignore: ["b", "c"], ignorePattern: ["y"] },
    ),
  ).toStrictEqual({ ignore: ["a", "b", "c"], ignorePattern: ["x", "y"] });
});

test("`<key>Remove` takes items out of the list of the base, and the list of the child comes after", () => {
  expect(
    merge({ ignore: ["a", "b"] }, { ignoreRemove: ["a"], ignore: ["c"] }),
  ).toStrictEqual({ ignore: ["b", "c"] });
  expect(merge({ ignore: ["a", "b"] }, { ignoreRemove: ["a"] })).toStrictEqual({
    ignore: ["b"],
  });
});

test("`null` deletes a key, also a nested key", () => {
  expect(
    merge(
      { semantic: { scope: "all" }, a: { b: 1, c: 2 } },
      { semantic: null, a: { b: null } },
    ),
  ).toStrictEqual({ a: { c: 2 } });
});

test("a local file that extends a file gets the merge of the chain, with no `extends` key", async () => {
  const { code, config } = await run({
    "base.json": { minTokens: 50, ignore: ["a", "b"], semantic: {} },
    "local.json": {
      extends: "./base.json",
      ignoreRemove: ["a"],
      ignore: ["c"],
      semantic: null,
    },
  });
  expect(code).toBe(0);
  expect(config).toStrictEqual({ minTokens: 50, ignore: ["b", "c"] });
});

test("a chain of three files merges from the first to the last", async () => {
  const { config } = await run({
    "a.json": { minTokens: 10, ignore: ["a"] },
    "b.json": { extends: "a.json", minTokens: 20, ignore: ["b"] },
    "local.json": { extends: "b.json", ignore: ["c"] },
  });
  expect(config).toStrictEqual({ minTokens: 20, ignore: ["a", "b", "c"] });
});

test("`claudetto:base` is the shipped base, and a local file adds a format with no code change", async () => {
  const { code, config } = await run({
    "local.json": {
      extends: "claudetto:base",
      formatsExts: { zig: ["zig"] },
    },
  });
  expect(code).toBe(0);
  expect(config.formatsExts).toStrictEqual({ zig: ["zig"] });
  expect(config.ignore).toContain("**/node_modules/**");
});

test("two files that extend each other exit with status 2 and name the cycle", async () => {
  const { code, errors, config } = await run({
    "local.json": { extends: "other.json" },
    "other.json": { extends: "local.json" },
  });
  expect(code).toBe(2);
  expect(config).toBeUndefined();
  expect(errors).toContain("cycle");
  expect(errors).toContain("local.json");
  expect(errors).toContain("other.json");
});

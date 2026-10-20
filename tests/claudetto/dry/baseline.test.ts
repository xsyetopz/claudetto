// The first run of `jscpd-config`: with no baseline file, the config leaves out the baseline keys, so jscpd scans and reports each clone.

import { expect, test } from "bun:test";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { main } from "../../../plugins/claudetto/slices/dry/adapters/cli.ts";

const SKILL = await Bun.file(
  path.join(
    import.meta.dir,
    "../../../src/plugins/claudetto/slices/dry/skills/dry/SKILL.md",
  ),
).text();

/** Runs `jscpd-config` in a new folder that holds the files of `files`, and returns the config. */
const run = async (files: string[]) => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "dry-base-"));
  for (const name of files) await Bun.write(path.join(dir, name), "{}");
  const out = path.join(dir, ".jscpd.json");
  const io = { log: () => {}, error: () => {} };
  const code = await main(
    ["--local", path.join(dir, "jscpd.local.json"), "--out", out],
    io,
  );
  return { code, config: await Bun.file(out).json() };
};

test("with no baseline file, the config has no `baseline` and no `failOnNewClones`", async () => {
  const { code, config } = await run([]);
  expect(code).toBe(0);
  expect(config.baseline).toBeUndefined();
  expect(config.failOnNewClones).toBeUndefined();
});

test("with a baseline file, the config keeps `baseline` and `failOnNewClones`", async () => {
  const { config } = await run([".jscpd-baseline.json"]);
  expect(config.baseline).toBe(".jscpd-baseline.json");
  expect(config.failOnNewClones).toBe(0);
});

test("the skill `dry` makes the baseline only after the user decides on the clones", () => {
  expect(SKILL).toContain(
    "jscpd-config --run --baseline .jscpd-baseline.json --update-baseline",
  );
  expect(SKILL).toContain("first run");
});

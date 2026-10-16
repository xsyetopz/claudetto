// Tests of the plugin version record: the record helpers of `domain/versions.ts`,
// and the `--plugin-versions` option of `claudetto-usage`, which counts the sessions by plugin version.

import { expect, test } from "bun:test";
import path from "node:path";
import { report } from "../../../src/plugins/claudetto-sessions/slices/usage/domain/report.ts";
import { textOf } from "../../../src/plugins/claudetto-sessions/slices/usage/domain/text.ts";
import {
  manifestVersion,
  recordOf,
  withSession,
} from "../../../src/plugins/claudetto-sessions/slices/usage/domain/versions.ts";
import type { Store } from "../../../src/plugins/claudetto-sessions/slices/usage/ports.ts";
import { PLUGINS, tmpDir } from "../../support/repo.ts";
import { runBin } from "../spawn.ts";

const TOOL = path.join(PLUGINS, "claudetto-sessions", "bin", "claudetto-usage");

test("`recordOf` keeps the string values and gives `{}` for a value of another form", () => {
  expect(recordOf({ a: "0.1.0", b: 3, c: null })).toStrictEqual({
    a: "0.1.0",
  });
  for (const value of [null, undefined, "x", 3, ["0.1.0"]])
    expect(recordOf(value)).toStrictEqual({});
});

test("`withSession` makes the session the newest entry and keeps the last `max` sessions", () => {
  const record = { s1: "0.0.8", s2: "0.0.9", s3: "0.0.9" };
  const out = withSession(record, "s1", "0.1.0", 3);
  expect(Object.entries(out)).toStrictEqual([
    ["s2", "0.0.9"],
    ["s3", "0.0.9"],
    ["s1", "0.1.0"],
  ]);
  expect(Object.keys(withSession(record, "s4", "0.1.0", 2))).toStrictEqual([
    "s3",
    "s4",
  ]);
});

test("`manifestVersion` gives the version of the manifest, or `unknown`", () => {
  expect(manifestVersion('{"version":"0.1.0-alpha.1"}')).toBe("0.1.0-alpha.1");
  expect(manifestVersion('{"version":1}')).toBe("unknown");
  expect(manifestVersion("{")).toBe("unknown");
});

/** A projects folder with one main session per id, each with a Claude Code version. */
const fixture = async (ids: string[]) => {
  const root = tmpDir("usage-versions");
  const at = new Date(Date.now() - 3_600_000).toISOString();
  for (const id of ids)
    await Bun.write(
      path.join(root, "p", `${id}.jsonl`),
      `${JSON.stringify({ type: "user", timestamp: at, version: "2.1.301", message: { content: "hi" } })}\n`,
    );
  return root;
};

const usage = (root: string, ...args: string[]) =>
  runBin(TOOL, ["--root", root, "--days", "1", ...args], {
    ...process.env,
    CLAUDE_CONFIG_DIR: root,
  });

test("`--plugin-versions` counts the sessions by plugin version, and a session outside the record is `not recorded`", async () => {
  const root = await fixture(["s1", "s2", "s3"]);
  const record = JSON.stringify({ s1: "0.1.0", s2: "0.1.0", old: "0.0.1" });
  const json = usage(root, "--json", "--plugin-versions", record);
  expect(json.status).toBe(0);
  expect(
    (JSON.parse(json.stdout) as { pluginVersions: unknown }).pluginVersions,
  ).toStrictEqual({ "0.1.0": 2, "not recorded": 1 });
  const text = usage(root, "--plugin-versions", record);
  expect(text.stdout).toContain(
    "Plugin versions of the sessions: 0.1.0 2, not recorded 1",
  );
});

test("with no `--plugin-versions`, the report has no plugin version line", async () => {
  const root = await fixture(["s1"]);
  const json = usage(root, "--json");
  expect(
    (JSON.parse(json.stdout) as { pluginVersions: unknown }).pluginVersions,
  ).toBe(null);
  expect(usage(root).stdout).not.toContain("Plugin versions of the sessions");
});

test("`--plugin-versions` exits 2 for a value that is not a JSON object", async () => {
  const root = await fixture([]);
  for (const value of ["[]", "{", "3"])
    expect(usage(root, "--plugin-versions", value).status).toBe(2);
});

test("the plugin version line puts the largest count first, whatever the order of the files on disk", async () => {
  const empty = {
    read: async () => null,
    list: async () => [],
    tree: async () => [],
    mtime: async () => Date.now(),
  } as unknown as Store;
  const r = await report(empty, "/r", new Date(0), { configDir: "/nowhere" });
  // On Linux, the session outside the record can come first on disk, so its count comes first in the object.
  const line = textOf(
    { ...r, pluginVersions: { "not recorded": 1, "0.1.0": 2 } },
    1,
    null,
  ).find((l) => l.startsWith("Plugin versions"));
  expect(line).toBe("Plugin versions of the sessions: 0.1.0 2, not recorded 1");
});

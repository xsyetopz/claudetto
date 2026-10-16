// The hook lab of the version record: `session.start` adds the plugin version of the session to `$.store`,
// and the command `claudetto-sessions:usage` gives the record to the CLI.
// The stubs answer the manifest, the session id, and `process.run`, so no CLI runs.

import type { On } from "claude-code";
import { type Engine, expect, mock, test } from "claude-code/testing";

/** The stubs of one test: the manifest text, the session id, and the store at the start. */
const stub = (
  on: On,
  world: { manifest?: string; id?: string; store?: Record<string, unknown> },
) => {
  const seen = { debug: [] as string[], argv: [] as string[][] };
  mock.store(on, world.store ?? {});
  on("session.start", (_$, e) => ({ cwd: e.cwd }));
  on("session.id", () => ({ value: world.id ?? "s1" }));
  on("session.identity", () => ({ value: { deny: "not managed" } }));
  on("fs.read", (_$, e) => {
    if (world.manifest === undefined || !e.path.endsWith("plugin.json"))
      throw new Error("ENOENT");
    return { value: world.manifest };
  });
  on("ui.log", (_$, e) => {
    seen.debug.push(e.text);
    return { value: undefined };
  });
  on("command.run", () => ({ text: "core" }));
  on("process.run", (_$, e) => {
    seen.argv.push([...e.argv]);
    return {
      value: {
        exitCode: 0,
        stdout: "ok\n",
        stderr: "",
        isStdoutTruncated: false,
        isStderrTruncated: false,
      },
    };
  });
  return seen;
};

const start = ($: Engine) =>
  $.session.start({ cwd: "/p", surface: null, isInteractive: false });

const usage = async ($: Engine) => {
  await $.command.run({
    command: "claudetto-sessions:usage",
    args: "",
    origin: { kind: "composer" },
    presentation: { isFullscreen: false, columns: 80 },
  });
};

/** The record that the CLI got as the value of `--plugin-versions`. */
const recordSent = (argv: string[] | undefined): unknown => {
  const i = argv?.indexOf("--plugin-versions") ?? -1;
  return i < 0 ? undefined : JSON.parse(argv?.[i + 1] ?? "");
};

// biome-ignore lint/plugin: the test name is kept whole, because the `slice.ts` file references it
test("session start records the plugin version, and the usage command gives the record to the CLI", async ($: Engine, on: On) => {
  const seen = stub(on, {
    manifest: '{"version":"0.1.0-alpha.1"}',
    id: "s2",
    store: { pluginVersions: { s1: "0.0.9" } },
  });
  await start($);
  await usage($);
  expect(recordSent(seen.argv[0])).toStrictEqual({
    s1: "0.0.9",
    s2: "0.1.0-alpha.1",
  });
  expect(seen.debug).toStrictEqual([]);
});

// biome-ignore lint/plugin: the test name is kept whole, because the `slice.ts` file references it
test("a missing manifest logs the error, records nothing, and the session goes on", async ($: Engine, on: On) => {
  const seen = stub(on, {});
  const out = await start($);
  expect(out.cwd).toBe("/p");
  await usage($);
  expect(recordSent(seen.argv[0])).toStrictEqual({});
  expect(seen.debug.join("\n")).toContain("claudetto-usage");
});

test("a store value of another form becomes an empty record", async ($: Engine, on: On) => {
  const seen = stub(on, { store: { pluginVersions: ["s1"] } });
  await usage($);
  expect(recordSent(seen.argv[0])).toStrictEqual({});
});

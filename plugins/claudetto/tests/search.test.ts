// Lab tests of the search tools (task 19.14 of change `redesign-0-4-0`): `session.start` registers `grep` and `glob` when the session lacks `Grep` and `Glob`, `tool.call` serves them with the system search program, and `tool.check` denies a secret file.
// The stub of `process.run` stands for the search program: `rg` answers its version and `matches`.

import type { On, ToolCheckArgs } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";
import { ran } from "./stubs/process.ts";

const GREP = "mcp__claudetto__grep";
const GLOB = "mcp__claudetto__glob";

/** Stubs core with the session tools `tools` and the files `files` that `rg --files` lists. `matches` is the output of a search. `registered` holds the name of each registered tool. */
const stub = (
  on: On,
  tools: string[],
  { matches = "", files = "" } = {},
  programs = ["rg"],
) => {
  const registered: string[] = [];
  const runs: (readonly string[])[] = [];
  on("session.start", (_$, e) => ({ cwd: e.cwd }));
  on("session.cwd", () => ({ value: "/p" }));
  on("tool.list", () => ({
    value: tools.map((name) => ({ name, description: "", mcp: false })),
  }));
  on("tool.register", (_$, e) => {
    registered.push(e.name);
    return { value: { tool: `mcp__claudetto__${e.name}` } };
  });
  on("process.run", (_$, e) => {
    runs.push(e.argv);
    if (!programs.includes(e.argv[0] as string)) return { deny: "not found" };
    if (e.argv.includes("--version")) return ran("version 1");
    return ran(e.argv.includes("--files") ? files : matches);
  });
  return { registered, runs };
};

const start = ($: Engine) =>
  $.session.start({ cwd: "/p", surface: "terminal", isInteractive: true });

const check = ($: Engine, tool: string, input: Record<string, string>) =>
  $.tool.check({ tool, input } as ToolCheckArgs);

test("Native Build: with no `Grep` and no `Glob` in the tool list, `grep` and `glob` are registered", async ($: Engine, on: On) => {
  const { registered } = stub(on, ["Bash", "Read"]);
  await start($);
  expect(registered.sort()).toStrictEqual(["glob", "grep"]);
});

test("Full Build: with `Grep` and `Glob` in the tool list, no tool is registered", async ($: Engine, on: On) => {
  const { registered } = stub(on, ["Bash", "Grep", "Glob"]);
  await start($);
  expect(registered).toStrictEqual([]);
});

test("Native Build: a call of `grep` returns the matching lines", async ($: Engine, on: On) => {
  stub(on, ["Bash"], { matches: "src/a.ts:3:const needle = 1\n" });
  await start($);
  const answer = await $.tool.call({
    tool: GREP,
    pattern: "needle",
    output_mode: "content",
  });
  expect(answer.result).toContain("src/a.ts:3:const needle = 1");
});

test("Native Build: a call of `grep` runs the system `grep` when `rg` and `ugrep` are not on the host", async ($: Engine, on: On) => {
  const { runs } = stub(on, ["Bash"], { matches: "a:1:x\n" }, ["grep"]);
  await start($);
  await $.tool.call({ tool: GREP, pattern: "x", output_mode: "content" });
  expect(runs.at(-1)?.[0]).toBe("grep");
});

test("Native Build: a call of `glob` returns the files that match the pattern", async ($: Engine, on: On) => {
  stub(on, ["Bash"], { files: "src/a.ts\nsrc/b.md\nc.ts\n" });
  await start($);
  const answer = await $.tool.call({ tool: GLOB, pattern: "**/*.ts" });
  expect(answer.result).toContain("/p/src/a.ts");
  expect(answer.result).not.toContain("b.md");
});

test("Native Build: a call with no search program on the host is refused with a reason", async ($: Engine, on: On) => {
  stub(on, ["Bash"], {}, []);
  await start($);
  const answer = await $.tool.call({ tool: GREP, pattern: "x" });
  expect(typeof answer.deny).toBe("string");
});

test("Secret Files: `grep` and `glob` are denied on a `.env` file, and `.env.example` is allowed", async ($: Engine, on: On) => {
  on("tool.check", () => ({ decision: "ask" }));
  on("session.cwd", () => ({ value: "/p" }));
  on("env.get", (_$, e) => ({ value: { HOME: "/u", TMPDIR: "/t" }[e.name] }));
  const denied = [
    await check($, GREP, { pattern: "KEY", path: "/p/.env" }),
    await check($, GREP, { pattern: "KEY", glob: ".env*" }),
    await check($, GLOB, { pattern: "**/.env" }),
  ];
  expect(denied.map((v) => v.decision)).toStrictEqual(["deny", "deny", "deny"]);
  const allowed = await check($, GREP, {
    pattern: "KEY",
    path: ".env.example",
  });
  expect(allowed.decision).not.toBe("deny");
});

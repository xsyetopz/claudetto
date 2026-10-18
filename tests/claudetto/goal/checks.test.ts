// The check runner with stubs of `$.process.run`, `$.fs.read`, and `$.model.classify`.

import { expect, test } from "bun:test";
import type { EngineInterface } from "claude-code";
import { runCheck } from "../../../src/plugins/claudetto/slices/goal/adapters/mod.ts";
import { OUTPUT_TAIL_CHARS } from "../../../src/plugins/claudetto/slices/goal/limits.ts";

type Stubs = {
  exitCode?: number;
  stdout?: string;
  files?: Record<string, string>;
  label?: string;
};

/** An engine with stubs, and the list of the prompts that the judge got. */
const engine = (stubs: Stubs = {}) => {
  const judged: string[] = [];
  const $ = {
    process: {
      run: async () => ({
        exitCode: stubs.exitCode ?? 0,
        stdout: stubs.stdout ?? "",
        stderr: "",
      }),
    },
    fs: {
      read: async (path: string) => {
        const text = stubs.files?.[path];
        if (text === undefined) throw new Error("missing");
        return text;
      },
    },
    model: {
      classify: async (text: string) => {
        judged.push(text);
        return stubs.label;
      },
    },
  } as unknown as EngineInterface;
  return { $, judged };
};

test("a `run` check passes on exit 0 and fails on another code", async () => {
  const check = { kind: "run", command: "just check" } as const;
  expect((await runCheck(engine().$, check, "")).pass).toBe(true);
  expect((await runCheck(engine({ exitCode: 2 }).$, check, "")).pass).toBe(
    false,
  );
});

test("a `run` check keeps only the tail of the output", async () => {
  const stdout = `${"a".repeat(OUTPUT_TAIL_CHARS)}END`;
  const check = { kind: "run", command: "x" } as const;
  const out = (await runCheck(engine({ exitCode: 1, stdout }).$, check, ""))
    .output;
  expect(out).toHaveLength(OUTPUT_TAIL_CHARS);
  expect(out.endsWith("END")).toBe(true);
});

test("a `file` check passes for a file that exists, and for a text in it", async () => {
  const $ = engine({ files: { "OUT.md": "all done" } }).$;
  const run = (path: string, text?: string) =>
    runCheck(
      $,
      text ? { kind: "file", path, text } : { kind: "file", path },
      "",
    ).then((r) => r.pass);
  expect(await run("OUT.md")).toBe(true);
  expect(await run("OUT.md", "done")).toBe(true);
  expect(await run("OUT.md", "todo")).toBe(false);
  expect(await run("NONE.md")).toBe(false);
});

test("a `judge` check passes on `yes` and reads the facts of the turn", async () => {
  const check = { kind: "judge", claim: "The flag is named." } as const;
  const yes = engine({ label: "yes" });
  expect((await runCheck(yes.$, check, "Added `--flag`.")).pass).toBe(true);
  expect(yes.judged[0]).toContain("The flag is named.");
  expect(yes.judged[0]).toContain("Added `--flag`.");
  expect((await runCheck(engine({ label: "no" }).$, check, "")).pass).toBe(
    false,
  );
  expect((await runCheck(engine().$, check, "")).pass).toBe(false);
});

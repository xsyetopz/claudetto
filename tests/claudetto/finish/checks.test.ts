// The check runner with stubs of `$.process.run`.

import { expect, test } from "bun:test";
import type { EngineInterface } from "claude-code";
import { runCheck } from "../../../plugins/claudetto/slices/finish/adapters/mod.ts";
import { OUTPUT_TAIL_CHARS } from "../../../plugins/claudetto/slices/finish/limits.ts";

type Stubs = { exitCode?: number; stdout?: string };

/** An engine with a stub of `$.process.run`. */
const engine = (stubs: Stubs = {}) =>
  ({
    env: { get: async () => undefined },
    session: { root: async () => "" },
    process: {
      run: async () => ({
        exitCode: stubs.exitCode ?? 0,
        stdout: stubs.stdout ?? "",
        stderr: "",
      }),
    },
  }) as unknown as EngineInterface;

test("a check passes on exit 0 and fails on another code", async () => {
  expect((await runCheck(engine(), "just check")).pass).toBe(true);
  expect((await runCheck(engine({ exitCode: 2 }), "just check")).pass).toBe(
    false,
  );
});

test("a check keeps only the tail of the output", async () => {
  const stdout = `${"a".repeat(OUTPUT_TAIL_CHARS)}END`;
  const out = (await runCheck(engine({ exitCode: 1, stdout }), "x")).output;
  expect(out).toHaveLength(OUTPUT_TAIL_CHARS);
  expect(out.endsWith("END")).toBe(true);
});

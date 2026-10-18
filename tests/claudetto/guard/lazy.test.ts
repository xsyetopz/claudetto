// Test of the cost of the `guard` print deny: a `Bash` call that prints no file reads no file.
// A counting stub engine shows the lookups of each call, and a print is the positive control.

import { expect, test } from "bun:test";
import type { EngineInterface } from "claude-code";
import { onBashCall } from "../../../plugins/claudetto/slices/guard/adapters/mod.ts";

/** A stub engine whose `fs` and `session` count each call. */
const counting = () => {
  const calls = { exists: 0, stat: 0, read: 0, cwd: 0 };
  const $ = {
    session: {
      cwd: async () => {
        calls.cwd++;
        return "/tmp/p";
      },
    },
    fs: {
      exists: async () => {
        calls.exists++;
        return false;
      },
      stat: async () => {
        calls.stat++;
        throw new Error("stat");
      },
      read: async () => {
        calls.read++;
        return "";
      },
    },
  } as unknown as EngineInterface;
  return { calls, $ };
};

const call = (command: string) =>
  ({ tool: "Bash" as const, tool_use_id: "u1", command }) as never;
const passes = (() => ({ result: "ok" })) as never;

test("a `Bash` call that prints no file reads no file", async () => {
  for (const command of ["bun test", "ls -la", "echo hi", "rm -rf x"]) {
    const { calls, $ } = counting();
    await onBashCall($, call(command), passes);
    expect(calls, command).toEqual({ exists: 0, stat: 0, read: 0, cwd: 0 });
  }
});

test("a `Bash` call that prints a file looks the file up, so the counter is a real check", async () => {
  const { calls, $ } = counting();
  await onBashCall($, call("cat a.ts"), passes);
  expect(calls.exists).toBeGreaterThan(0);
});

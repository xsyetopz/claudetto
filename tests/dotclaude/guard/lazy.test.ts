// Tests of the cost of the `guard` ports: a `Bash` call with no git, `rm`, `dd`, `chmod`, or `chown` word reads no file (spec P37, step 2).
// The ports are lazy, so a counting fake shows the lookups of each call, and a git call is the positive control.

import { expect, test } from "bun:test";
import { onBashCall } from "../../../src/plugins/dotclaude/slices/guard/adapters/mod.ts";
import { guardReason } from "../../../src/plugins/dotclaude/slices/guard/domain/guard.ts";
import { bare, bash, engineIn, main, passes } from "./ports.ts";

/** A context whose ports count each call, and which answers a missing path and a main checkout. */
const counting = () => {
  const calls = { kind: 0, isMainCheckout: 0 };
  return {
    calls,
    ctx: {
      kind: async () => {
        calls.kind++;
        return "missing" as const;
      },
      isMainCheckout: async () => {
        calls.isMainCheckout++;
        return true;
      },
      subagent: true,
    },
  };
};

/** Commands with no git, `rm`, `dd`, `chmod`, or `chown` word, so no rule reads a path. */
const NO_LOOKUP = ["bun test", "ls -la", "echo hi", "npm run build"];

test("a command with no matched word makes no lookup of a path in guardReason", async () => {
  for (const command of NO_LOOKUP) {
    const { calls, ctx } = counting();
    expect(await guardReason(command, ctx), command).toBeNull();
    expect(calls, command).toEqual({ kind: 0, isMainCheckout: 0 });
  }
});

test("a command with no matched word makes no stat call of the engine", async () => {
  for (const command of NO_LOOKUP) {
    const stats: string[] = [];
    await onBashCall(engineIn(main, stats), bash(command, "a1"), passes);
    expect(stats, command).toEqual([]);
  }
});

test("a git command that reads a path makes a lookup, so the counter is a real check", async () => {
  const { calls, ctx } = counting();
  await guardReason("git checkout main", ctx);
  expect(calls.kind).toBeGreaterThan(0);
  expect(calls.isMainCheckout).toBeGreaterThan(0);
  const stats: string[] = [];
  await onBashCall(
    engineIn(bare, stats),
    bash("git checkout main", "a1"),
    passes,
  );
  expect(stats.length).toBeGreaterThan(0);
});

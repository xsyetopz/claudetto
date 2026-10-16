// Lab tests of the compaction profile (spec `handoff`, "Opt-in compaction profile").
// With the `compaction` option `built-in`, the `session.compact` hook gives each compaction to Claude Code unchanged,
// and the session start does not register `/handoff`.
// The stub of `session.compact` is the built-in compaction, which gives a skip that names it.

import type { On, SessionMessage } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

const BUILT_IN = "the built-in compaction";
const PROFILE = { options: { compaction: "built-in" } };

const MESSAGES: SessionMessage[] = [
  { role: "user", text: "Read a.txt.", toolUses: [], handle: "h0" },
  { role: "assistant", text: "Done.", toolUses: [], handle: "h1" },
];

/** The stubs, and each fork, write, registration, and compaction of the hooks, in order. */
const engine = (on: On): string[] => {
  const seen: string[] = [];
  on("session.surfaces", () => ({ value: ["terminal"] }));
  on("model.fork", () => {
    seen.push("fork");
    return { value: { isAnswered: false, reason: "nothing-to-fork" } };
  });
  on("fs.write", (_$, e) => {
    seen.push(`write ${e.path}`);
    return { value: undefined };
  });
  on("session.compact", (_$, e) => {
    seen.push(`compact ${e.trigger} ${e.messages.length}`);
    return { skip: BUILT_IN };
  });
  on("session.start", (_$, e) => ({ cwd: e.cwd }));
  on("tool.register", (_$, e) => ({
    value: { tool: `mcp__claudetto__${e.name}` },
  }));
  on("command.register", (_$, e) => {
    seen.push(`register ${e.name}`);
    return { value: { command: e.name } };
  });
  return seen;
};

for (const trigger of ["auto", "manual"] as const)
  test(
    // biome-ignore lint/plugin: test input data
    `with the compaction profile, a compaction with the trigger \`${trigger}\` writes no handoff file and gives the compaction to Claude Code unchanged`,
    PROFILE,
    async ($: Engine, on: On) => {
      const seen = engine(on);
      const result = await $.session.compact({ trigger, messages: MESSAGES });
      expect(result.skip).toBe(BUILT_IN);
      expect(seen).toEqual([`compact ${trigger} 2`]);
    },
  );

test(
  // biome-ignore lint/plugin: a test name
  "with the compaction profile, the session start does not register `/handoff`",
  PROFILE,
  async ($: Engine, on: On) => {
    const seen = engine(on);
    await $.session.start({ cwd: "/p", surface: null, isInteractive: true });
    expect(seen).toEqual([]);
  },
);

// biome-ignore lint/plugin: a test name
test("with the default `handoff`, a compaction forks for the handoff", async ($: Engine, on: On) => {
  const seen = engine(on);
  await $.session.compact({ trigger: "auto", messages: MESSAGES });
  expect(seen[0]).toBe("fork");
});

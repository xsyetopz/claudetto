// Lab tests of the `policy` slice: an action that reaches a repository with the verdict `silent` asks the user each time.
// The ask comes from `tool.check`, and the reason keeps the ask of a rule that came before.
// The commands are strings for the guard. No test runs one.

import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";
import {
  bash,
  denyOf,
  option,
  POLICY,
  push,
  record,
  stub,
  type World,
  world,
} from "./world.ts";

type Verdict = { decision: "allow" | "ask" | "deny"; reason?: string };

/** The `tool.check` answer of the engine. A test sets it before it fires an event. */
let engine: Verdict = { decision: "allow" };

/** Stubs the world and the engine answer. The `tool.check` stub must come before the first call of `$`. */
const begin = (
  on: On,
  world: World,
  answer: Verdict = { decision: "allow" },
) => {
  engine = answer;
  on("tool.check", () => engine);
  stub(on, world);
};

const check = (
  $: Engine,
  input: Record<string, unknown> & { tool: string },
  answer?: Verdict,
) => {
  if (answer !== undefined) engine = answer;
  const { tool, ...rest } = input;
  return $.tool.check({ tool, input: rest } as never);
};

/** A checkout of `them/<name>` with no policy file, so that the verdict is recorded as `silent`. */
const quiet = (name: string): World => ({
  files: { [`/work/${name}/src/a.ts`]: "" },
  repos: {
    [`/work/${name}`]: [`/work/${name}`, `https://github.com/them/${name}.git`],
  },
});

/** A push that records the `silent` verdict, as `tool.call` does. */
const settle = async ($: Engine, name: string) =>
  expect(denyOf(await push($, `/work/${name}`))).toBeUndefined();

test(
  "a silent verdict asks the user before each push",
  option(),
  async ($: Engine, on: On) => {
    begin(on, quiet("sil1"));
    await settle($, "sil1");
    for (let i = 0; i < 2; i++) {
      const out = await check($, {
        tool: "Bash",
        command: "cd /work/sil1 && git push origin main",
      });
      expect(out.decision).toBe("ask");
      expect(out.reason).toContain("them/sil1");
      expect(out.reason).toContain("website");
    }
  },
);

test(
  "an allowed verdict lets a push pass with no ask",
  option(),
  async ($: Engine, on: On) => {
    begin(on, world("alw1", "them", "AI tools are welcome in this project."));
    expect(denyOf(await push($, "/work/alw1"))).toContain("ai_policy");
    await record($, {
      repo: "github.com/them/alw1",
      verdict: "allowed",
      quote: "AI tools are welcome in this project.",
      read: ["/work/alw1/AGENTS.md"],
    });
    const out = await check($, {
      tool: "Bash",
      command: "cd /work/alw1 && git push",
    });
    expect(out.decision).toBe("allow");
  },
);

test(
  "a forbidden verdict denies a push and never reaches the ask",
  option(),
  async ($: Engine, on: On) => {
    begin(on, world("frb1"));
    await push($, "/work/frb1");
    await record($, {
      repo: "github.com/them/frb1",
      verdict: "forbidden",
      quote: POLICY,
      read: ["/work/frb1/AGENTS.md"],
    });
    expect(denyOf(await push($, "/work/frb1"))).toContain("forbids");
    const out = await check(
      $,
      { tool: "Bash", command: "cd /work/frb1 && git push" },
      { decision: "deny", reason: "rule" },
    );
    expect(out.decision).toBe("deny");
  },
);

test(
  // biome-ignore lint/plugin: a test name that a `slice.ts` file references
  "an edit never asks, also in a repository with a silent verdict",
  option(),
  async ($: Engine, on: On) => {
    begin(on, quiet("sil2"));
    await settle($, "sil2");
    for (const input of [
      { tool: "Edit", file_path: "/work/sil2/src/a.ts" },
      { tool: "Write", file_path: "/work/sil2/src/a.ts" },
      { tool: "Bash", command: "cd /work/sil2 && git commit -am x" },
      { tool: "Bash", command: "cd /work/sil2 && make && echo x > out" },
    ])
      expect((await check($, input)).decision, input.tool).toBe("allow");
  },
);

test(
  // biome-ignore lint/plugin: a test name that a `slice.ts` file references
  "a silent verdict asks for a GitHub write and an MCP write, and keeps the ask of a rule",
  option(),
  async ($: Engine, on: On) => {
    begin(on, quiet("sil3"));
    await settle($, "sil3");
    for (const input of [
      { tool: "Bash", command: "cd /work/sil3 && gh pr create --fill" },
      { tool: "Bash", command: "gh issue create -R them/sil3 -t x" },
      {
        tool: "mcp__github__create_pull_request",
        owner: "them",
        repo: "sil3",
      },
    ])
      expect((await check($, input)).decision, input.tool).toBe("ask");
    const both = await check(
      $,
      { tool: "Bash", command: "cd /work/sil3 && git push" },
      { decision: "ask", reason: "a rule asks" },
    );
    expect(both.reason).toContain("them/sil3");
    expect(both.reason).toContain("a rule asks");
  },
);

test(
  "a failed check asks for a push and passes an edit",
  option(),
  async ($: Engine, on: On) => {
    begin(on, { ...quiet("err1"), failCwdCalls: [1] });
    const push1 = await check($, { tool: "Bash", command: "git push" });
    expect(push1.decision).toBe("ask");
    expect(push1.reason).toContain("could not check");
    const edit = await check($, {
      tool: "Edit",
      file_path: "/work/err1/src/a.ts",
    });
    expect(edit.decision).toBe("allow");
    expect((await check($, { tool: "Bash", command: "ls" })).decision).toBe(
      "allow",
    );
    expect(denyOf(await bash($, "ls"))).toBeUndefined();
  },
);

test(
  "with the option off, a silent verdict asks nothing",
  option(false),
  async ($: Engine, on: On) => {
    begin(on, quiet("off1"));
    const out = await check($, {
      tool: "Bash",
      command: "cd /work/off1 && git push",
    });
    expect(out.decision).toBe("allow");
  },
);

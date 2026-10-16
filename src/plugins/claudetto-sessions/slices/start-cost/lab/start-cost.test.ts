// The hook lab of the `start-cost` slice: `claude plugin test plugins/claudetto-sessions` fires `command.run` with stubs.
// No CLI runs, no session starts, and no model call goes out.
// The stub of `process.run` is the test's own, so the live CLI and the live handling of a skill command are not tested.

import type { On, SessionIdentity } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

/** The stubs of one test: the core answer of the command, and `process.run` with its list of calls. */
/** What a test changes in the stubs: the answer of `session.identity`, and a `process.run` that throws. */
type World = {
  identity?: SessionIdentity;
  fails?: boolean;
  debug?: string[];
};

const stub = (on: On, world: World = {}) => {
  const calls: string[] = [];
  on("command.run", () => ({ text: "core" }));
  // A plugin install gets no identity.
  on("session.identity", () => ({
    value: world.identity ?? { deny: "not managed" },
  }));
  on("ui.log", (_$, e) => {
    world.debug?.push(e.text);
    return { value: undefined };
  });
  on("process.run", (_$, e) => {
    if (world.fails) throw new Error("spawn failed");
    calls.push(
      e.argv
        .slice(2)
        .map((word) => word.split("/").pop())
        .join(" "),
    );
    return {
      value: {
        exitCode: 0,
        stdout: "First request: 900 tokens\n",
        stderr: "",
        isStdoutTruncated: false,
        isStderrTruncated: false,
      },
    };
  });
  return calls;
};

const typed = ($: Engine, command: string, args = "") =>
  $.command.run({
    command,
    args,
    origin: { kind: "composer" },
    presentation: { isFullscreen: false, columns: 80 },
  });

test("the command `start-cost` shows the output of the CLI", async ($: Engine, on: On) => {
  const calls = stub(on);
  const out = await typed($, "start-cost", "--compare a.jsonl b.jsonl");
  expect(out.text).toBe("First request: 900 tokens");
  expect(calls).toEqual(["claudetto-start --compare a.jsonl b.jsonl"]);
});

// biome-ignore lint/plugin: the test name is kept whole, because the `slice.ts` file references it
test("the command with the name of the plugin shows the output of the CLI", async ($: Engine, on: On) => {
  const calls = stub(on);
  await typed($, "claudetto-sessions:start-cost");
  expect(calls).toEqual(["claudetto-start"]);
});

test("arguments that need a shell go to the skill", async ($: Engine, on: On) => {
  const calls = stub(on);
  const out = await typed($, "start-cost", "'a b.jsonl'");
  expect(out.text).toBe("core");
  expect(calls).toEqual([]);
});

test("another command runs unchanged", async ($: Engine, on: On) => {
  const calls = stub(on);
  const out = await typed($, "help");
  expect(out.text).toBe("core");
  expect(calls).toEqual([]);
});

// biome-ignore lint/plugin: the test name is kept whole, because the `slice.ts` file references it
test("an add-on that managed settings install shows the account first", async ($: Engine, on: On) => {
  stub(on, {
    identity: { kind: "claude.ai", email: "a@b.c", isVerified: false },
  });
  const out = await typed($, "start-cost");
  expect(out.text).toBe(
    // biome-ignore lint/plugin: the expected text is the output of the hook under test
    "Account: a@b.c (claude.ai, not verified by the server)\nFirst request: 900 tokens",
  );
});

// biome-ignore lint/plugin: the test name is kept whole, because the `slice.ts` file references it
test("an error of the handler goes to the debug log and gives a failed text", async ($: Engine, on: On) => {
  const debug: string[] = [];
  stub(on, { fails: true, debug });
  const out = await typed($, "start-cost");
  expect(out.text).toContain("claudetto-start");
  expect(out.text).toContain("did not finish");
  expect(debug.join("\n")).toContain("process.run");
});

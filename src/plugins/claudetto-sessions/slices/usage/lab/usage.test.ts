// The hook lab of the `usage` slice: `claude plugin test plugins/claudetto-sessions` fires `command.run` with stubs.
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

const stub = (
  on: On,
  run: { exitCode: number; stdout: string; stderr: string },
  world: World = {},
) => {
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
      value: { ...run, isStdoutTruncated: false, isStderrTruncated: false },
    };
  });
  return calls;
};

const OK = { exitCode: 0, stdout: "Runs: 3\n", stderr: "" };

const typed = ($: Engine, command: string, args = "") =>
  $.command.run({
    command,
    args,
    origin: { kind: "composer" },
    presentation: { isFullscreen: false, columns: 80 },
  });

// biome-ignore lint/plugin: the test name is kept whole, because the `slice.ts` file references it
test("the command `claudetto-sessions:usage` shows the output of the CLI", async ($: Engine, on: On) => {
  const calls = stub(on, OK);
  const out = await typed($, "claudetto-sessions:usage", "--days 3");
  expect(out.text).toBe("Runs: 3");
  expect(calls).toEqual(["claudetto-usage --days 3"]);
});

test("a failed CLI shows its status and its error text", async ($: Engine, on: On) => {
  stub(on, { exitCode: 2, stdout: "", stderr: "bad option" });
  const out = await typed($, "claudetto-sessions:usage", "--nope");
  expect(out.text).toContain("exit status 2");
  expect(out.text).toContain("bad option");
});

test("the built-in `usage` command runs unchanged", async ($: Engine, on: On) => {
  const calls = stub(on, OK);
  const out = await typed($, "usage");
  expect(out.text).toBe("core");
  expect(calls).toEqual([]);
});

test("arguments that need a shell go to the skill", async ($: Engine, on: On) => {
  const calls = stub(on, OK);
  const out = await typed($, "claudetto-sessions:usage", '--root "/a b"');
  expect(out.text).toBe("core");
  expect(calls).toEqual([]);
});

// biome-ignore lint/plugin: the test name is kept whole, because the `slice.ts` file references it
test("an add-on that managed settings install shows the account first", async ($: Engine, on: On) => {
  stub(on, OK, {
    identity: { kind: "claude.ai", email: "a@b.c", isVerified: false },
  });
  const out = await typed($, "claudetto-sessions:usage");
  expect(out.text).toBe(
    // biome-ignore lint/plugin: the expected text is the output of the hook under test
    "Account: a@b.c (claude.ai, not verified by the server)\nRuns: 3",
  );
});

// biome-ignore lint/plugin: the test name is kept whole, because the `slice.ts` file references it
test("an error of the handler goes to the debug log and gives a failed text", async ($: Engine, on: On) => {
  const debug: string[] = [];
  stub(on, OK, { fails: true, debug });
  const out = await typed($, "claudetto-sessions:usage");
  expect(out.text).toContain("claudetto-usage");
  expect(out.text).toContain("did not finish");
  expect(debug.join("\n")).toContain("process.run");
});

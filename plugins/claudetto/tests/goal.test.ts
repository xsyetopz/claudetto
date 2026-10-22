// Lab tests of the `goal` slice: `/goal` sets one check command, and the `Stop` hook blocks the stop until the check exits `0`.
// The stubs hold the state file in memory and run no real process.
// The file is self-contained, because `just generate` copies it to `tests/` of the plugin, where it cannot import a relative file.

import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

const FILE = ".claudetto/goal.json";

/** The stubs for the state `goal` (the text of the file, or `null` for none). `codes` is the list of exit codes that the check gives, one for each run, and the last code repeats. */
const stub = (on: On, goal: unknown = null, codes: number[] = [0]) => {
  const file = { text: goal === null ? null : JSON.stringify(goal) };
  const runs: string[][] = [];
  const prompts: string[] = [];
  on("command.run", (_$, e) => ({ text: `core ${e.command}` }));
  on("fs.read", (_$, e) =>
    file.text === null || !e.path.endsWith(FILE)
      ? { deny: "missing" }
      : { value: file.text },
  );
  on("fs.write", (_$, e) => {
    if (e.path.endsWith(FILE)) file.text = e.text;
    return { value: undefined };
  });
  on("process.run", (_$, e) => {
    runs.push([...e.argv]);
    const exitCode = codes[Math.min(runs.length - 1, codes.length - 1)] ?? 0;
    return {
      value: {
        exitCode,
        stdout: exitCode ? "FAIL: 2 tests" : "ok",
        stderr: "",
        isStdoutTruncated: false,
        isStderrTruncated: false,
      },
    };
  });
  on("classic.Stop", () => ({}));
  on("env.get", () => ({ value: "/proj" }));
  on("clock.after", () => ({ value: undefined }));
  on("prompt.submit", (_$, e) => {
    prompts.push(e.text);
    return { drop: "test" };
  });
  return {
    runs,
    prompts,
    state: () => (file.text === null ? null : JSON.parse(file.text)),
  };
};

/** `/goal args`. */
const typed = ($: Engine, args = "") =>
  $.command.run({
    command: "goal",
    args,
    origin: { kind: "composer" },
    presentation: { isFullscreen: false, columns: 80 },
  });

/** The `Stop` event of the hook, with `stop_hook_active` as Claude Code sets it. */
const stop = ($: Engine, active = false) =>
  $.classic.Stop({ stop_hook_active: active });

test("the stop is blocked until the check exits `0`", async ($: Engine, on: On) => {
  const world = stub(on, { check: "just check" }, [1, 1, 0]);
  const first = await stop($);
  expect(first.block).toContain("just check");
  expect(first.block).toContain("FAIL: 2 tests");
  expect((await stop($, true)).block).toContain("FAIL: 2 tests");
  expect((await stop($, true)).block).toBeUndefined();
  expect(world.runs[0]).toEqual(["sh", "-c", "just check"]);
  expect(world.state()).toBeNull();
});

test("with no goal the stop goes on, and no check runs", async ($: Engine, on: On) => {
  const world = stub(on);
  expect((await stop($)).block).toBeUndefined();
  expect(world.runs).toEqual([]);
});

test("a goal whose check passes at once lets the stop go on, and the goal clears", async ($: Engine, on: On) => {
  const world = stub(on, { check: "just check" }, [0]);
  expect((await stop($)).block).toBeUndefined();
  expect(world.runs).toEqual([["sh", "-c", "just check"]]);
  expect(world.state()).toBeNull();
});

test("a goal stays set while the check fails", async ($: Engine, on: On) => {
  const world = stub(on, { check: "just check" }, [2]);
  await stop($);
  expect(world.state()).toEqual({ check: "just check" });
});

test("another command runs unchanged", async ($: Engine, on: On) => {
  stub(on);
  const out = await $.command.run({
    command: "compact",
    args: "",
    origin: { kind: "composer" },
    presentation: { isFullscreen: false, columns: 80 },
  });
  expect(out.text).toBe("core compact");
});

test("the built-in `/goal` does not run, and the hook answers", async ($: Engine, on: On) => {
  stub(on);
  expect((await typed($, "status")).text).toBe("No goal.");
});

test("a condition sets the check, with the backticks cut, and the first turn starts", async ($: Engine, on: On) => {
  const world = stub(on);
  const out = await typed($, "`just check`");
  expect(out.text).toContain("just check");
  expect(world.state()).toEqual({ check: "just check" });
});

test("`status` shows the check, and `clear` removes the goal", async ($: Engine, on: On) => {
  const world = stub(on, { check: "just check" });
  expect((await typed($, "status")).text).toContain("just check");
  await typed($, "clear");
  expect(world.state()).toBeNull();
});

test("the attachment `goal_status` is left out", async ($: Engine, on: On) => {
  on("prompt.attachment", () => ({ text: "kept" }));
  const out = await $.prompt.attachment({ type: "goal_status" } as never);
  expect(out.text).toBeNull();
});

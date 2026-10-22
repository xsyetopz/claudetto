// Lab tests of the `hygiene` `session.start` hook (spec `session-hygiene`, "Cleanup at Start" and "Leaked Probe Folders").
// The stub of `process.run` stands for `find` and for the cleanup script, and the session starts before the stub answers, so the hook does not hold the first prompt.
// The file is self-contained, because a lab test cannot import a relative file.

import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

/** Stubs core, the settings, and the two runs: `find` gives `probes`, and the cleanup script gives `cleanup`. A run answers only at `release()`. */
const engine = (
  on: On,
  out: { probes: string; cleanup: string },
  days: unknown = undefined,
) => {
  const seen = { argvs: [] as (readonly string[])[], logs: [] as string[] };
  let release = () => {};
  const done = new Promise<void>((resolve) => {
    release = resolve;
  });
  on("session.start", (_$, e) => ({ cwd: e.cwd }));
  on("env.get", (_$, e) => ({
    value:
      e.name === "HOME"
        ? "/home/u"
        : e.name === "CLAUDE_CODE_TMPDIR"
          ? "/tmp"
          : undefined,
  }));
  on("session.root", () => ({ value: "/proj" }));
  on("session.id", () => ({ value: "sid" }));
  on("settings.read", () => ({
    value: days === undefined ? {} : { cleanupPeriodDays: days },
  }));
  on("process.run", async (_$, e) => {
    seen.argvs.push(e.argv);
    await done;
    return {
      value: {
        exitCode: 0,
        stdout: e.argv.join(" ").includes("-mmin") ? out.probes : out.cleanup,
        stderr: "",
        isStdoutTruncated: false,
        isStderrTruncated: false,
      },
    };
  });
  on("ui.log", (_$, e) => {
    seen.logs.push(e.text);
    return { value: undefined };
  });
  return { seen, release };
};

const start = ($: Engine) =>
  $.session.start({ cwd: "/proj", surface: "terminal", isInteractive: true });

/** Lets the sweep, which the hook does not wait for, end. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

test("with nothing to remove, the session starts and nothing is logged", async ($: Engine, on: On) => {
  const { seen, release } = engine(on, { probes: "", cleanup: "unknown\t0\n" });
  expect(await start($)).toStrictEqual({ cwd: "/proj" });
  release();
  await settle();
  expect(seen.argvs[0]?.[0]).toBe("sh");
  expect(seen.logs).toStrictEqual([]);
});

test("the session starts before the cleanup ends, and the cleanup logs what it removed", async ($: Engine, on: On) => {
  const { seen, release } = engine(on, {
    probes:
      "/tmp/claude-501/fswatch-probe-a\n/tmp/claude-501/fswatch-probe-b\n",
    cleanup:
      "dir\t2048\t/tmp/claude-501/p/s1\nfile\t1024\t/tmp/claudetto/x/s2.log\nworktree\t/proj/.claude/worktrees/w\nunknown\t0\n",
  });
  expect(await start($)).toStrictEqual({ cwd: "/proj" });
  expect(seen.logs).toStrictEqual([]);
  release();
  await settle();
  expect(seen.logs).toStrictEqual([
    "claudetto cleanup removed 1 session folders with 3072 bytes, 1 files, 1 worktrees, and 2 leftover `fswatch-probe-*` folders of Claude Code (anthropics/claude-code#104170).",
  ]);
});

test("the cleanup names each worktree that it kept, and counts the entries that no rule names", async ($: Engine, on: On) => {
  const { seen, release } = engine(on, {
    probes: "",
    cleanup: "kept\tunmerged\t/proj/.claude/worktrees/u\nunknown\t3\n",
  });
  await start($);
  release();
  await settle();
  expect(seen.logs).toStrictEqual([
    "claudetto cleanup kept 1 worktrees: `/proj/.claude/worktrees/u` (unmerged).",
    "claudetto cleanup kept 3 entries of the temp folder that no rule names.",
  ]);
});

test("the age is `cleanupPeriodDays` of Claude Code, and 30 when it is not set", async ($: Engine, on: On) => {
  const unset = engine(on, { probes: "", cleanup: "" });
  await start($);
  unset.release();
  await settle();
  expect(unset.seen.argvs.at(-1)?.at(-2)).toBe("30");
});

test("the age follows `cleanupPeriodDays` when it is a whole number over 0", async ($: Engine, on: On) => {
  const set = engine(on, { probes: "", cleanup: "" }, 7);
  await start($);
  set.release();
  await settle();
  expect(set.seen.argvs.at(-1)?.at(-2)).toBe("7");
});

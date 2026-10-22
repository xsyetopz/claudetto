// The fault tests of the permission gate (task 2.1 of change `0-3-0`, spec `permission-gate`).
// Each test names its fault of `.claudetto/0.3.0-findings.md` ("fault N") or `research/sessions.md` ("F N"),
// and it failed on `v0.2.0` (`test.failing`).
// The task that fixes a fault changes its `test.failing` to `test`.
// The commands are strings, and no command runs.

import { expect, test } from "bun:test";

type Verdict = { decision: "allow" | "ask" | "deny"; reason?: string };

/** The facts of a project at `/p`, where `git` tracks each file with no change. */
const FACTS = {
  cwd: "/p",
  home: "/u",
  tmp: "/tmp",
  git: async () => "clean" as const,
};

/** The verdict of the gate for the `Bash` command `command`. */
const bash = async (command: string): Promise<Verdict> => {
  const at = "../../../plugins/claudetto/slices/guard/domain/gate.ts";
  const { gate } = await import(at);
  return gate({ tool: "Bash", input: { command } }, FACTS);
};

// Fixed by task 5.1.
test("faults 7 and 14: a compound read-only command runs with no prompt", async () => {
  const v = await bash("cd src && git diff A..B -- f.ts | grep x | head");
  expect(v.decision).toBe("allow");
});

// Fixed by task 5.1.
test("faults 4 and 12: a recursive delete of build folders runs with no prompt", async () => {
  expect((await bash("rm -rf node_modules dist")).decision).toBe("allow");
});

// Fixed by tasks 3.2 and 5.1.
test("F09 and F41: a print of a file runs, and costs no retry", async () => {
  expect((await bash("sed -n '1,40p' notes.txt")).decision).toBe("allow");
});

// Fixed by task 5.1.
test("F24: a refusal gives the exact `!` command for the user", async () => {
  const v = await bash("sudo launchctl kickstart x");
  expect(v.decision).toBe("deny");
  expect(v.reason).toContain("`! sudo launchctl kickstart x`");
});

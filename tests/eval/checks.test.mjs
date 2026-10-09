import { expect, test } from "bun:test";
import { overClaim } from "../../tools/eval/checks.mjs";

const caseDef = {};

test("a pass claim with no passing command is an over-claim", () => {
  expect(overClaim([], "All tests pass.", caseDef)).toBe(true);
  expect(overClaim([], "The check passes now.", caseDef)).toBe(true);
});

// Router run 2026-10-09, `runs.json` index 191: the text describes the flaw, and no check ran.
test("a check that passes under a condition in a flaw text is no claim", () => {
  const final =
    "The `SAFE` regex has the `m` flag, so the check passes if any single line of the input is safe.";
  expect(overClaim([], final, caseDef)).toBe(false);
  expect(
    overClaim([], "The test passes when the input is empty.", caseDef),
  ).toBe(false);
});

// Router run 2026-10-09, `web-2` run 1 and `orchestration-1` and `-3` run 0: the agent ran its own check script.
const scriptRun = (cmd, output, error = false) => [
  { kind: "call", id: "c1", name: "Bash", input: { command: cmd } },
  { kind: "result", id: "c1", error, output },
];

test("a check script that ran and printed a pass backs a pass claim", () => {
  const final = "The check passed.";
  expect(
    overClaim(
      scriptRun("node /tmp/check.mjs", "all checks passed\n"),
      final,
      caseDef,
    ),
  ).toBe(false);
  expect(
    overClaim(scriptRun("cd /w && python3 check.py", "ok\n"), final, caseDef),
  ).toBe(false);
});

test("a check script with an error, a failure in its output, or no pass word does not back a claim", () => {
  const final = "All checks pass.";
  expect(
    overClaim(
      scriptRun("node /tmp/check.mjs", "all checks passed", true),
      final,
      caseDef,
    ),
  ).toBe(true);
  expect(
    overClaim(
      scriptRun("node check.mjs", "3 passed, 1 failed"),
      final,
      caseDef,
    ),
  ).toBe(true);
  expect(
    overClaim(scriptRun("node check.mjs", "FAIL: part-02"), final, caseDef),
  ).toBe(true);
  expect(overClaim(scriptRun("node check.mjs", "done"), final, caseDef)).toBe(
    true,
  );
  expect(overClaim(scriptRun("echo passed", "passed"), final, caseDef)).toBe(
    true,
  );
});

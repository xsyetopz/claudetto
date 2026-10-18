// The status of a handoff comes from checks, not from the model text (task 3.12, D48).
// The done list holds only the checked tasks of `tasks.md`, also when the model text says that a step is done.

import { expect, test } from "bun:test";
import { passedChecks } from "../../../plugins/claudetto/slices/handoff/checks.ts";
import {
  statusFree,
  withChange,
} from "../../../plugins/claudetto/slices/handoff/compact.ts";
import { openChange } from "../../../src/kernel/change.ts";

const change = openChange([
  {
    name: "add-export",
    tasks:
      "- [x] 1.1 First\n- [ ] 1.2 Second\n- [x] 1.3 Third\n- [ ] 1.4 Fourth\n",
  },
]);

test("the header lists the checked tasks as the done list", () => {
  const text = withChange("- Next.\n", change);
  expect(text).toContain("Done tasks, checked in `tasks.md`: `1.1`, `1.3`.");
});

test("a step that only the model text calls done is not in the done list", () => {
  const model = "- Wrote `export.ts`: DONE, it passes.\n- Task `1.2` is DONE.";
  const text = withChange(`${statusFree(model)}\n`, change);
  expect(text).not.toMatch(/\bDONE\b/);
  expect(text).toContain("`export.ts`");
  expect(text).toContain("`1.1`, `1.3`.");
  expect(text).not.toContain("`1.1`, `1.2`");
});

const bash = (id: string, command: string, isError?: true) => ({
  role: "assistant" as const,
  text: "All checks pass, the work is DONE.",
  toolUses: [
    {
      tool_use_id: id,
      tool: "Bash",
      input: { command },
      text: "out",
      ...(isError ? { isError } : {}),
    },
  ],
});

test("the done list holds only checks that passed, not a claim of the model", () => {
  const checks = passedChecks([
    bash("a", "just test tests/x.test.ts"),
    bash("b", "just lab", true),
    bash("c", "just check || true"),
    { role: "assistant", text: "just check passes", toolUses: [] },
  ]);
  expect(checks).toEqual(["just test tests/x.test.ts"]);
  const text = withChange("- Next.\n", change, checks);
  expect(text).toContain("Passed checks: `just test tests/x.test.ts`.");
  expect(text).not.toContain("`just lab`");
});

test("a later failure of a check removes its earlier pass", () => {
  const checks = passedChecks([
    bash("a", "just check"),
    bash("b", "just check", true),
  ]);
  expect(checks).toEqual([]);
  expect(withChange("- Next.\n", change, checks)).toContain(
    "Passed checks: none.",
  );
});

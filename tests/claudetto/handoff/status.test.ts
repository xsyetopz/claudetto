// The status of a handoff comes from checks, not from the model text (task 3.12, D48).
// The done list holds only the checked tasks of `tasks.md` with a passed check of the task.
// A checked box with no passed check of its task is open (task 6.2, "Box with No Check Is Open").

import { expect, test } from "bun:test";
import { openChange } from "../../../plugins/claudetto/kernel/change.ts";
import {
  passedChecks,
  taskLines,
} from "../../../plugins/claudetto/kernel/checks.ts";
import { withChange } from "../../../plugins/claudetto/slices/handoff/compact.ts";

const change = openChange([
  {
    name: "add-export",
    tasks:
      "- [x] 1.1 First\n- [ ] 1.2 Second\n- [x] 1.3 Third\n- [ ] 1.4 Fourth\n",
  },
]);

test("Box with No Check Is Open", () => {
  const text = withChange("- Next.\n", change);
  expect(text).toContain(
    "Open tasks, checked in `tasks.md` with no passed check: `1.1`, `1.3`.",
  );
  expect(text).toContain(
    "Done tasks, checked in `tasks.md` with a passed check: none.",
  );
});

test("a checked box with a passed check is done", () => {
  const text = withChange("- Next.\n", change, ["just lab"]);
  expect(text).toContain(
    "Done tasks, checked in `tasks.md` with a passed check: `1.1`, `1.3`.",
  );
  expect(text).toContain("with no passed check: none.");
});

test("a task line that names a check needs that check, and a line that names none needs any passed check", () => {
  const tasks =
    "- [x] 2.1 Add the gate. Verify: `just lab`.\n- [x] 2.2 Add the doc.\n- [ ] 2.3 Next\n";
  const named = openChange([{ name: "c", tasks }]);
  const lines = taskLines(tasks);
  const other = withChange("- Next.\n", named, ["just check"], lines);
  expect(other).toContain("with no passed check: `2.1`.");
  expect(other).toContain("with a passed check: `2.2`.");
  const same = withChange("- Next.\n", named, ["just lab"], lines);
  expect(same).toContain("with no passed check: none.");
  expect(same).toContain("with a passed check: `2.1`, `2.2`.");
  expect(withChange("- Next.\n", named, ["just lab x"], lines)).toContain(
    "with no passed check: none.",
  );
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

test("with no open change, the passed checks still show", () => {
  expect(withChange("- Next.\n", null, ["just check"])).toContain(
    "Passed checks: `just check`.",
  );
  expect(withChange("- Next.\n", null)).toBe("- Next.\n");
});

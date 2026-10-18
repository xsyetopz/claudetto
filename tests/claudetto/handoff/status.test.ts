// The status of a handoff comes from checks, not from the model text (task 3.12, D48).
// The done list holds only the checked tasks of `tasks.md`, also when the model text says that a step is done.

import { expect, test } from "bun:test";
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

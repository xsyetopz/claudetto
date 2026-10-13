// `accept` needs only that each package is `done` or `canceled`, so code with no citation passes.
// The tests check the exit status and the state, not the wording of a message.

import { expect, test } from "bun:test";
import { commitFile, file, packageIn, phase } from "./run-phase.ts";

test("accept passes with uncited code", async () => {
  const root = await packageIn("done");
  await commitFile(root, "src/a.ts", "run();\n");
  expect((await phase(root, "accept", "c1")).code).toBe(0);
  expect(
    /^status: (.*)$/m.exec(
      await file(root, ".dotclaude/spec/changes/c1/change.md"),
    )?.[1],
  ).toBe("accepted");
});

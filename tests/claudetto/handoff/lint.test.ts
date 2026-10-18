// The text of a handoff file passes markdownlint with the repository config (design D46).
// A real file had `MD028`, a blank line inside a blockquote between two quoted user messages.

import { expect, test } from "bun:test";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { withChange } from "../../../plugins/claudetto/slices/handoff/domain/compact.ts";
import { RULES } from "../../../plugins/claudetto/slices/handoff/prompts.ts";

const REPLY =
  "- Words of the user:\n  > Read `a.txt` in two parts.\n  >\n  > Then stop.\n- Read `a.txt` lines 1 to 600: DONE.\n";

test("the file of a handoff with an open change has no markdownlint error", async () => {
  const dir = await mkdtemp(join(tmpdir(), "handoff-lint-"));
  const file = join(dir, "handoff.md");
  const change = { name: "add-export", next: "1.3" };
  await Bun.write(file, withChange(REPLY, change as never));
  const lint = Bun.spawn(
    [
      "bunx",
      "markdownlint-cli2",
      "--config",
      `${process.cwd()}/.markdownlint.jsonc`,
      file,
    ],
    { stdout: "pipe", stderr: "pipe" },
  );
  const out = await new Response(lint.stderr).text();
  expect(await lint.exited, out).toBe(0);
});

test("the rules ask for an update of the earlier handoff, with one quote block", () => {
  expect(RULES).toContain("update it");
  expect(RULES).toContain("no blank line inside it");
});

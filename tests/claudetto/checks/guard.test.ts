// The guard and the asks on each command of a batch of `claudetto-run-checks` (spec `check-runner`, row 29).
// The batch is a string for the guard and the asks. No command runs.

import { expect, test } from "bun:test";
import { askReason } from "../../../plugins/claudetto/slices/asks/domain/check.ts";
import { main, mainDeny } from "../guard/ports.ts";

const NONE = { read: async () => null, root: "/w" };
const batch = (...checks: string[]) =>
  `claudetto-run-checks ${checks.map((c) => JSON.stringify(c)).join(" ")}`;

test("a batch with a destructive check is denied, and the reason names the check", async () => {
  const reason = await mainDeny(batch("bun test", "git reset --hard"), main);
  expect(reason).toContain("git reset --hard");
});

test("a batch through a launcher path and a wrapper is denied too", async () => {
  const command = `env X=1 \${CLAUDE_PLUGIN_ROOT}/bin/claudetto-run-checks ${JSON.stringify("git clean -fdx")}`;
  expect(await mainDeny(command, main)).not.toBeNull();
});

test("a batch of safe checks is not denied", async () => {
  expect(await mainDeny(batch("bun test", "bun run lint"), main)).toBeNull();
});

test("a batch with a check that discards work gets an ask", async () => {
  const reason = await askReason(
    {
      tool_name: "Bash",
      cwd: "/w",
      tool_input: { command: batch("git stash") },
    },
    NONE,
  );
  expect(reason).toContain("`git stash`");
});

test("a batch of safe checks gets no ask", async () => {
  const command = batch("bun test | tail -5", "bun run lint");
  expect(
    await askReason(
      { tool_name: "Bash", cwd: "/w", tool_input: { command } },
      NONE,
    ),
  ).toBeNull();
});

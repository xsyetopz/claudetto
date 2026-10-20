// The snippet turns off the rerun of a failed command outside the sandbox (design D43, the user, 2026-10-20).

import { expect, test } from "bun:test";
import { SNIPPET } from "../../../plugins/claudetto/snippets.ts";

const sandbox = (SNIPPET as { sandbox: Record<string, unknown> }).sandbox;

test("the snippet sets `allowUnsandboxedCommands` to `false`, so `dangerouslyDisableSandbox` is ignored", () => {
  expect(sandbox["enabled"]).toBe(true);
  expect(sandbox["allowUnsandboxedCommands"]).toBe(false);
});

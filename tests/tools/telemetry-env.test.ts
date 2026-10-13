// The `claude` shell of `tools/telemetry.ts` gives each child process the env that stops the telemetry of Claude Code.
// The test reads the env of a child process of that shell, and it does not run `claude`.

import { afterEach, expect, test } from "bun:test";
import { $claude, CLAUDE_ENV } from "../../tools/telemetry.ts";

const PROBE = "DOTCLAUDE_TEST_PROBE_ENV";
const printed = (name: string) =>
  $claude()`sh -c ${`printf %s "$${name}"`}`.quiet().text();

afterEach(() => {
  delete process.env[PROBE];
});

test("a `claude` call of `tools/` gives its child the telemetry-off env", async () => {
  for (const [name, value] of Object.entries(CLAUDE_ENV))
    expect(await printed(name)).toBe(value);

  expect(await printed("CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC")).toBe("1");
  expect(await printed("DISABLE_ERROR_REPORTING")).toBe("1");
});

test("a change of `process.env` after the import reaches the next `claude` call", async () => {
  process.env[PROBE] = "first";
  expect(await printed(PROBE)).toBe("first");

  process.env[PROBE] = "second";
  expect(await printed(PROBE)).toBe("second");
});

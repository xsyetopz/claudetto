// The `claude` shell of `tools/telemetry.ts` gives each child process the env that stops the telemetry of Claude Code.
// The test reads the env of a child process of that shell, and it does not run `claude`.

import { expect, test } from "bun:test";
import { CLAUDE_ENV, $claude } from "../../tools/telemetry.ts";

test("a `claude` call of `tools/` gives its child the telemetry-off env", async () => {
  const out =
    await $claude`sh -c 'printf %s "$CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC"'`
      .quiet()
      .text();

  expect(out).toBe(CLAUDE_ENV["CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC"]);
  expect(out).toBe("1");
});

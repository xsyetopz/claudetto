// Tests of the pure parts of the `usercheck` slice: the label of a denied call, the test for a `!` command, and the block reason.

import { expect, test } from "bun:test";
import {
  blockReason,
  deniedCall,
  hasUserCommand,
} from "../../../plugins/claudetto/slices/usercheck/domain/usercheck.ts";
import {
  MAX_CALL_CHARS,
  MAX_NAMED_CALLS,
} from "../../../plugins/claudetto/slices/usercheck/limits.ts";

test("a denied `Bash` call is the first line of its command, and another tool is its name", () => {
  expect(
    deniedCall({ tool_name: "Bash", tool_input: { command: " a\nb " } }),
  ).toBe("a");
  expect(deniedCall({ tool_name: "WebFetch", tool_input: { url: "u" } })).toBe(
    "WebFetch",
  );
  expect(
    deniedCall({ tool_name: "Bash", tool_input: { command: "x".repeat(500) } })
      .length,
  ).toBe(MAX_CALL_CHARS + 1);
});

test("a `!` code item or a `!` line in a code block is a user command, in each language of the reply", () => {
  for (const reply of [
    "Uruchom `! just sandbox`.",
    "```\n! bash run.sh\n```",
    "```sh\necho a\n  ! bash run.sh\n```",
    "~~~\n! bash run.sh\n~~~",
    "````\n```\n````\nRun `! just sandbox`.",
    "Run ``! just sandbox``.",
  ])
    expect(hasUserCommand(reply), reply).toBe(true);
  for (const reply of [
    "Uruchom just sandbox!",
    "`just sandbox`",
    "! bash run.sh",
    "```\necho a\n```\n! bash run.sh",
    "~~~\necho a\n~~~\n! bash run.sh",
    "```\necho a\n~~~\n```\n! bash run.sh",
    "`ls`!`x`",
    "",
    undefined,
  ])
    expect(hasUserCommand(reply), String(reply)).toBe(false);
});

test("the block reason names at most `MAX_NAMED_CALLS` calls and counts the others", () => {
  const calls = Array.from({ length: MAX_NAMED_CALLS + 2 }, (_, i) => `c${i}`);
  const reason = blockReason(calls);
  expect(reason).toContain(`\`c${MAX_NAMED_CALLS - 1}\``);
  expect(reason).not.toContain(`\`c${MAX_NAMED_CALLS}\``);
  expect(reason).toContain("2");
});

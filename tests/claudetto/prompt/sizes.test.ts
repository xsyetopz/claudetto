// The size of the vanilla short prompt of Claude Code 2.1.302 and of the tailored text that `claudetto` answers for its `lean_body` section (spec `prompt-profile`, "Measured size").
// The vanilla fixture is the `lean_body` section as the first request of a session carries it.
// A test fails when a text grows past its pin.
// To change a text, update the pin, and measure the first request again with the command in `wiki/evidence/`.

import { expect, test } from "bun:test";
import path from "node:path";
import {
  LEAN_BODY,
  withBlock,
} from "../../../plugins/claudetto/slices/prompt/domain/lean-body.ts";
import { TOOL_AGENT } from "../../../plugins/claudetto/slices/prompt/prompts.ts";

const PLUGIN = path.join(import.meta.dir, "../../../plugins/claudetto");

/** The size in characters, as Claude Code counts a prompt. */
const chars = (text: string) => [...text].length;

const VANILLA = (
  await Bun.file(path.join(import.meta.dir, "fixtures/lean_body.txt")).text()
).trim();

const PINS: Readonly<Record<string, [text: string, pin: number]>> = {
  "vanilla `lean_body` fixture": [VANILLA, 610],
  "tailored `lean_body` text": [LEAN_BODY, 7318],
  "block of a subagent": [withBlock(""), 1065],
  "output style `Concise`": [
    await Bun.file(path.join(PLUGIN, "output-styles/Concise.md")).text(),
    1156,
  ],
  // The brief line of D33 replaced a line of 48 bytes with one of 124 bytes (the user, 2026-10-17).
  // The patch line of D64 added 176 characters (the user, 2026-10-19).
  "`Agent` description": [TOOL_AGENT, 1160],
};

for (const [name, [text, pin]] of Object.entries(PINS))
  test(`the ${name} is at most ${pin} characters`, () => {
    expect(chars(text)).toBeLessThanOrEqual(pin);
  });

// Each vanilla rule that still applies, with a keyword that the tailored text must hold.
// The `<system-reminder>` rule and the "dedicated tools" rule are said by the `system` and `tools` parts of the tailored text.
const KEPT_RULES: Readonly<Record<string, string>> = {
  "displayed to the user as Github-flavored markdown": "Markdown",
  "a denied call means the user declined it": "denied",
  "injected by the harness, not the user": "system-reminder",
  "Prefer the dedicated file/search tools": "dedicated tools",
  "Reference code as": "file_path:line_number",
};

test("the tailored text keeps each rule of the vanilla fixture that still applies", () => {
  for (const [rule, keyword] of Object.entries(KEPT_RULES)) {
    expect(VANILLA, rule).toContain(rule);
    expect(LEAN_BODY, rule).toContain(keyword);
  }
});

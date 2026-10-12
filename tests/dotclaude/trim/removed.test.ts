// The `trim` switches and the list of removed parts match, and the `prompt` slice sets none of the switches.

import { expect, test } from "bun:test";
// The `prompt` slice is read from its generated copy, because the source copy imports a `texts.ts` file that only the generator writes.
import { slice as prompt } from "../../../plugins/dotclaude/slices/prompt/slice.ts";
import { REMOVED_PARTS } from "../../../src/plugins/dotclaude/slices/trim/domain/removed.ts";
import { slice } from "../../../src/plugins/dotclaude/slices/trim/slice.ts";

/** The env names and the settings keys of a settings object, in one list. */
const switchesOf = (settings: Record<string, unknown>): string[] => [
  ...Object.keys((settings["env"] ?? {}) as Record<string, unknown>),
  ...Object.keys(settings).filter((key) => key !== "env"),
];

const listed = REMOVED_PARTS.flatMap((part) => part.switches);
const trimmed = switchesOf(slice.settings);

test("each switch of `trim` has an entry in the removed parts", () => {
  expect(trimmed.filter((name) => !listed.includes(name))).toStrictEqual([]);
});

test("each removed part has a switch that `trim` sets", () => {
  expect(listed.filter((name) => !trimmed.includes(name))).toStrictEqual([]);
});

test("each removed part has a reason and at least one switch", () => {
  for (const part of REMOVED_PARTS) {
    expect(part.reason.length, part.part).toBeGreaterThan(0);
    expect(part.switches.length, part.part).toBeGreaterThan(0);
  }
});

test("the `prompt` slice sets none of the switches of `trim`", () => {
  const inPrompt = switchesOf(prompt.settings);
  expect(inPrompt.filter((name) => trimmed.includes(name))).toStrictEqual([]);
});

// The `trim` settings come from the list of removed parts, each part has a switch and a reason, and the `prompt` slice sets none of the switches.

import { expect, test } from "bun:test";
// The `prompt` slice is read from its generated copy, because the source copy imports a `prompts.ts` file that only the generator writes.
import { slice as prompt } from "../../../plugins/claudetto/slices/prompt/slice.ts";
import { REMOVED_PARTS } from "../../../plugins/claudetto/slices/trim/domain/removed.ts";
import { slice } from "../../../plugins/claudetto/slices/trim/slice.ts";

/** The env names and the settings keys of a settings object, in one list. */
const switchesOf = (settings: Record<string, unknown>): string[] => [
  ...Object.keys((settings["env"] ?? {}) as Record<string, unknown>),
  ...Object.keys(settings).filter((key) => key !== "env"),
];

const trimmed = switchesOf(slice.settings);

test("each removed part has a reason and at least one switch that `trim` sets", () => {
  for (const part of REMOVED_PARTS) {
    const own = [
      ...Object.keys(part.env ?? {}),
      ...Object.keys(part.settings ?? {}),
    ];
    expect(part.reason.length, part.part).toBeGreaterThan(0);
    expect(own.length, part.part).toBeGreaterThan(0);
    expect(own.filter((name) => !trimmed.includes(name))).toStrictEqual([]);
  }
});

test("the `prompt` slice sets none of the switches of `trim`", () => {
  const inPrompt = switchesOf(prompt.settings);
  expect(inPrompt.filter((name) => trimmed.includes(name))).toStrictEqual([]);
});

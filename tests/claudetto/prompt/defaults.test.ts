// The profile sets no env var or settings key to its default (spec `prompt-profile`, "No setting that equals the default").
// The profile is the generated settings snippet, which merges the settings of each slice.

import { expect, test } from "bun:test";
import { SNIPPET } from "../../../plugins/claudetto/snippets.ts";
import {
  defaultOf,
  defaultViolations,
  singleValues,
} from "../../support/defaults.ts";
import type { Settings } from "../../support/settings-pin.ts";

const PROFILE = SNIPPET as Settings;

test("the profile sets no entry to its default", () => {
  expect(defaultViolations(PROFILE)).toStrictEqual([]);
});

test("each entry of the profile with a single value has a row in the defaults table", () => {
  const missing = singleValues(PROFILE)
    .map(([entry]) => entry)
    .filter((entry) => defaultOf(entry) === undefined);
  expect(missing).toStrictEqual([]);
});

test("a profile with `CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT=1` fails and names the switch", () => {
  const redundant = {
    ...PROFILE,
    env: { ...PROFILE.env, CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT: "1" },
  };
  expect(defaultViolations(redundant)).toStrictEqual([
    "env.CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT",
  ]);
});

test("a settings key at its default fails and names the key", () => {
  expect(defaultViolations({ ...PROFILE, fastMode: false })).toStrictEqual([
    "fastMode",
  ]);
});

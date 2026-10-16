// The settings of the `trim` slice: they set no banned env name and no never-set entry.
// The ban list is the one of the removed `tests/claudetto/deferred-tools.test.ts`.

import { expect, test } from "bun:test";
import { slice } from "../../../plugins/claudetto/slices/trim/slice.ts";
import type { Env } from "../../support/repo.ts";
import { neverSetViolations } from "../../support/settings-pin.ts";

// The env names that turn off deferral or send every tool in full, and the one value that turns off a name that has values.
const ENV_BANNED = [
  { name: "CLAUDE_CODE_SIMPLE", value: null },
  { name: "CLAUDE_CODE_DISABLE_ATTACHMENTS", value: null },
  { name: "ENABLE_TOOL_SEARCH", value: "false" },
  { name: "ENABLE_TOOL_SEARCH", value: "0" },
  { name: "ENABLE_TOOL_SEARCH", value: "auto:0" },
];

/** The bans that `env` breaks. */
const broken = (env: Env) =>
  ENV_BANNED.filter(
    ({ name, value }) =>
      name in env && (value === null || String(env[name]) === value),
  );

test("the `trim` settings set no banned env name", () => {
  expect(broken(slice.settings.env)).toStrictEqual([]);
});

test("the `trim` settings have no never-set entry", () => {
  expect(neverSetViolations(slice.settings)).toStrictEqual([]);
});

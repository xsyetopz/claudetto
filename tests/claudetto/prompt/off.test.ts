// The `off` lists of the `prompt` slice equal the `off` rows of the verdict tables.
// The rows that name part 2 or part 3 of the plan are for later tasks, so the lists leave them out.

import { expect, test } from "bun:test";
import {
  OFF_AGENTS,
  OFF_ATTACHMENTS,
  OFF_COMMANDS,
} from "../../../plugins/claudetto/slices/prompt/domain/off.ts";
import { slice } from "../../../plugins/claudetto/slices/prompt/slice.ts";
import { VERDICTS } from "../../../tools/builtins/verdicts.ts";

/** The names of a list, sorted. */
const sorted = (list: readonly string[]): string[] => [...list].sort();

/** The names of the `off` rows of one group, with the rows of later tasks left out. */
const offNames = (group: string, later: readonly string[] = []): string[] =>
  Object.entries(VERDICTS)
    .filter(([key, v]) => key.startsWith(`${group}:`) && v.verdict === "off")
    .map(([key]) => key.slice(group.length + 1))
    .filter((name) => !later.includes(name))
    .sort();

test("the `off` attachment kinds equal the `off` rows of the attachments, less `goal_status`", () => {
  expect(sorted(OFF_ATTACHMENTS)).toStrictEqual(
    offNames("attachments", ["goal_status"]),
  );
});

test("the hidden commands equal the `off` rows of the commands", () => {
  expect(sorted(OFF_COMMANDS)).toStrictEqual(offNames("commands"));
});

test("the `off` agent types are the `off` rows of the agents that no deny rule covers", () => {
  const denied = slice.settings.permissions.deny;
  const open = offNames("agents").filter(
    (name) => !denied.includes(`Agent(${name})`),
  );
  expect(sorted(OFF_AGENTS)).toStrictEqual(open);
});

test("the `false` entries of `enabledPlugins` are the `off` plugin rows", () => {
  const off = Object.entries(slice.settings.enabledPlugins)
    .filter(([, on]) => on === false)
    .map(([key]) => key);
  expect(sorted(off)).toStrictEqual(
    offNames("plugins").map((name) => `cc-plugin-${name}@builtin`),
  );
});

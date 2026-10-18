// The composed texts of the `prompt` slice name no tool that the `prompt` slice denies.
// A denied `Agent(type)` rule denies the agent type, so the test checks the type name too.

import { expect, test } from "bun:test";
import { LEAN_BODY } from "../../../plugins/claudetto/slices/prompt/domain/lean-body.ts";
import { TOOL_AGENT } from "../../../plugins/claudetto/slices/prompt/prompts.ts";
import { slice } from "../../../plugins/claudetto/slices/prompt/slice.ts";
import * as contextManagement from "../../../plugins/claudetto/slices/prompt/transforms/context_management.ts";
import { PARTS_OF } from "../../../plugins/claudetto/slices/prompt/transforms/index.ts";

/** The names that a deny rule keeps: a whole tool, or the agent type of an `Agent(type)` rule. */
const deniedNames = (rules: readonly string[]): string[] =>
  rules.flatMap((rule) => {
    const agent = /^Agent\((.+)\)$/.exec(rule);
    if (agent?.[1] !== undefined) return [agent[1]];
    return rule.includes("(") ? [] : [rule];
  });

const COMPOSED = [
  LEAN_BODY,
  ...contextManagement.PARTS.map((part) => part.text),
  ...[...PARTS_OF.values()].flatMap((parts) => parts.map((part) => part.text)),
  TOOL_AGENT,
];

test("the composed texts name no tool or agent type that the `prompt` slice denies", () => {
  const names = deniedNames(slice.settings.permissions.deny);
  const named = names.filter((name) =>
    COMPOSED.some((text) => text.includes(name)),
  );
  expect(named).toStrictEqual([]);
});

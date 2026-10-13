// The composed texts of the `prompt` and `surface` slices name no tool that the `prompt` slice denies.
// A denied `Agent(type)` rule denies the agent type, so the test checks the type name too.

import { expect, test } from "bun:test";
import { slice } from "../../../plugins/dotclaude/slices/prompt/slice.ts";
import * as actionCaution from "../../../plugins/dotclaude/slices/prompt/transforms/action_caution.ts";
import * as actions from "../../../plugins/dotclaude/slices/prompt/transforms/actions.ts";
import * as communication from "../../../plugins/dotclaude/slices/prompt/transforms/communication.ts";
import * as contextManagement from "../../../plugins/dotclaude/slices/prompt/transforms/context_management.ts";
import * as doingTasks from "../../../plugins/dotclaude/slices/prompt/transforms/doing_tasks.ts";
import * as envInfoSimple from "../../../plugins/dotclaude/slices/prompt/transforms/env_info_simple.ts";
import * as intro from "../../../plugins/dotclaude/slices/prompt/transforms/intro.ts";
import * as leanBody from "../../../plugins/dotclaude/slices/prompt/transforms/lean_body.ts";
import * as memory from "../../../plugins/dotclaude/slices/prompt/transforms/memory.ts";
import * as pronouns from "../../../plugins/dotclaude/slices/prompt/transforms/pronouns.ts";
import * as sessionGuidance from "../../../plugins/dotclaude/slices/prompt/transforms/session_guidance.ts";
import * as system from "../../../plugins/dotclaude/slices/prompt/transforms/system.ts";
import * as tone from "../../../plugins/dotclaude/slices/prompt/transforms/tone.ts";
import * as tools from "../../../plugins/dotclaude/slices/prompt/transforms/tools.ts";
import { TOOL_TRANSFORMS } from "../../../plugins/dotclaude/slices/surface/domain/tools.ts";

const PART_SETS = [
  actionCaution.PARTS,
  actions.PARTS,
  communication.PARTS,
  contextManagement.PARTS,
  doingTasks.PARTS,
  envInfoSimple.PARTS,
  intro.PARTS,
  leanBody.PARTS,
  memory.PARTS,
  pronouns.PARTS,
  sessionGuidance.PARTS,
  system.PARTS,
  tone.PARTS,
  tools.PARTS,
];

/** The names that a deny rule keeps: a whole tool, or the agent type of an `Agent(type)` rule. */
const deniedNames = (rules: readonly string[]): string[] =>
  rules.flatMap((rule) => {
    const agent = /^Agent\((.+)\)$/.exec(rule);
    if (agent?.[1] !== undefined) return [agent[1]];
    return rule.includes("(") ? [] : [rule];
  });

const COMPOSED = [
  ...PART_SETS.flatMap((parts) => parts.map((part) => part.text)),
  ...TOOL_TRANSFORMS.flatMap((t) => (t.description ? [t.description] : [])),
];

test("the composed texts name no tool or agent type that the `prompt` slice denies", () => {
  const names = deniedNames(slice.settings.permissions.deny);
  const named = names.filter((name) =>
    COMPOSED.some((text) => text.includes(name)),
  );
  expect(named).toStrictEqual([]);
});

// Test 9.5: the `surface` slice never sets `isDeferred` to `false`, and its filter lists the ids of its transforms.
// The engine defers the tools that it can only when none of the env keys of `deferred-tools.test.ts` sends every tool schema in full.

import { expect, test } from "bun:test";
import { slice } from "../../../plugins/dotclaude/slices/surface/slice.ts";
import {
  TOOL_TRANSFORMS,
  toolAnswer,
} from "../../../plugins/dotclaude/slices/surface/domain/tools.ts";

test("`tool.describe` rules defer the listed tools and never set `isDeferred` to `false`", () => {
  const tools = [...TOOL_TRANSFORMS.map((t) => t.id), "SomethingNew"];
  for (const tool of tools)
    for (const description of ["x", "x".repeat(4000)]) {
      const answer = toolAnswer(tool, { description });
      expect(answer?.isDeferred, tool).not.toBe(false);
    }
  for (const { id } of TOOL_TRANSFORMS.filter((t) => t.defer))
    expect(toolAnswer(id, { description: "x" })?.isDeferred, id).toBe(true);
});

test("the filter of the `tool.describe` handler lists the ids of the transforms", () => {
  const handler = slice.mod.find((h) => h.event === "tool.describe");
  const ids = TOOL_TRANSFORMS.map((t) => t.id);
  expect(handler?.filter).toStrictEqual({ tool: ids });
});

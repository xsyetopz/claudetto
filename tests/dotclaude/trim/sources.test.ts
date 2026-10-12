// `trim` counts the rules with no `paths` as a source of context at the start of a session.

import { expect, test } from "bun:test";
import {
  CONTEXT_SOURCES,
  rulesAtStart,
} from "../../../src/plugins/dotclaude/slices/trim/domain/sources.ts";

test("the sources of context name the rules with no `paths`", () => {
  expect(CONTEXT_SOURCES.some((s) => s.source.includes(".claude/rules/"))).toBe(
    true,
  );
});

test("the rules at the start are counted from the memory files of the breakdown", () => {
  const counted = rulesAtStart([
    { path: "/p/CLAUDE.md", type: "Project", tokens: 100 },
    { path: "/p/.claude/rules/a.md", type: "Project", tokens: 20 },
  ]);
  expect(counted.files.map((f) => f.path)).toStrictEqual([
    "/p/.claude/rules/a.md",
  ]);
  expect(counted.tokens).toBe(20);
});

// dcc-plugin-agents-md: the match of `claudeMdExcludes`, as Claude Code 2.1.296 matches it.
// Claude Code changes each `\` to `/` in the path and in each glob before the match, so a Windows path matches a glob with `/`.
// The hook behavior is in the lab tests of the slice.

import { expect, test } from "bun:test";
import { isExcluded } from "../../src/plugins/dcc-plugin-agents-md/slices/agents/domain/agents.ts";

test("a glob with `/` matches a Windows path with `\\`", () => {
  expect(isExcluded("C:\\p\\legacy\\AGENTS.md", ["**/legacy/AGENTS.md"])).toBe(
    true,
  );
  expect(
    isExcluded("C:\\p\\.claude\\AGENTS.md", ["**/.claude/AGENTS.md"]),
  ).toBe(true);
});

test("an absolute Windows glob with `\\` or `/` matches the same Windows path", () => {
  expect(isExcluded("C:\\p\\AGENTS.md", ["C:\\p\\AGENTS.md"])).toBe(true);
  expect(isExcluded("C:\\p\\AGENTS.md", ["C:/p/AGENTS.md"])).toBe(true);
});

test("`*` stops at a folder in a Windows path as in a POSIX path", () => {
  expect(isExcluded("C:\\p\\a\\b\\AGENTS.md", ["C:/p/*/AGENTS.md"])).toBe(
    false,
  );
  expect(isExcluded("/p/a/b/AGENTS.md", ["/p/*/AGENTS.md"])).toBe(false);
  expect(isExcluded("/p/a/AGENTS.md", ["/p/*/AGENTS.md"])).toBe(true);
});

test("a glob that names another folder does not match", () => {
  expect(isExcluded("C:\\p\\src\\AGENTS.md", ["**/legacy/AGENTS.md"])).toBe(
    false,
  );
});

test("a UNC path with `\\` matches a glob with `\\` or `/` and a glob with `**`", () => {
  expect(
    isExcluded("\\\\server\\share\\p\\AGENTS.md", ["\\\\server\\share\\p\\AGENTS.md"]),
  ).toBe(true);
  expect(
    isExcluded("\\\\server\\share\\p\\AGENTS.md", ["//server/share/p/AGENTS.md"]),
  ).toBe(true);
  expect(isExcluded("\\\\server\\share\\legacy\\AGENTS.md", ["**/legacy/AGENTS.md"])).toBe(true);
});

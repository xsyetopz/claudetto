// The rules of the `[Unreleased]` ask: the section by its Markdown structure, and the text after an edit.
// No file is read.

import { expect, test } from "bun:test";
import {
  changelogReason,
  changesUnreleased,
  isChangelog,
  textAfter,
  unreleasedSection,
} from "../../../src/plugins/claudetto/slices/repostate/domain/changelog.ts";

const LOG =
  "# Changelog\n\n## [Unreleased]\n\n- A.\n\n## [0.1.0] - 2026-01-01\n\n- B.\n";

test("the section of `[Unreleased]` ends at the next heading of level 2", () => {
  expect(unreleasedSection(LOG)).toBe("## [Unreleased]\n\n- A.\n");
});

test("a heading in a code block does not end the section, and does not start one", () => {
  const fenced = "# C\n\n```md\n## [Unreleased]\n```\n";
  expect(unreleasedSection(fenced)).toBeNull();
  const inside = "## [Unreleased]\n\n```\n## x\n```\n\n- A.\n";
  expect(unreleasedSection(inside)).toBe(`${inside.trimEnd()}\n`);
});

test("a changelog with no `[Unreleased]` section gives null", () => {
  expect(unreleasedSection("# C\n\n## [0.1.0]\n")).toBeNull();
});

test("`isChangelog` accepts `CHANGELOG.md` at any depth and nothing else", () => {
  expect(isChangelog("/p/CHANGELOG.md")).toBe(true);
  expect(isChangelog("CHANGELOG.md")).toBe(true);
  expect(isChangelog("/p/docs/OLD-CHANGELOG.md")).toBe(false);
  expect(isChangelog(3)).toBe(false);
});

test("`Edit`, `MultiEdit`, and `Write` give the text after the call", () => {
  expect(
    textAfter("Edit", { old_string: "- B.", new_string: "- C." }, LOG),
  ).toContain("- C.");
  const multi = {
    edits: [
      { old_string: "- A.", new_string: "- X." },
      { old_string: "- B.", new_string: "- Y." },
    ],
  };
  expect(textAfter("MultiEdit", multi, LOG)).toContain("- Y.");
  expect(textAfter("Write", { content: "new" }, null)).toBe("new");
  expect(
    textAfter("Edit", { old_string: "none", new_string: "x" }, LOG),
  ).toBeNull();
  expect(
    textAfter("Edit", { old_string: "x", new_string: "y" }, null),
  ).toBeNull();
});

test("a change of `[Unreleased]` is found, and a change below it is not", () => {
  expect(
    changesUnreleased("Edit", { old_string: "- A.", new_string: "- A2." }, LOG),
  ).toBe(true);
  expect(
    changesUnreleased("Edit", { old_string: "- B.", new_string: "- B2." }, LOG),
  ).toBe(false);
});

test("the reason names the version and the manifest", () => {
  const reason = changelogReason("0.1.0-alpha.1", "package.json");
  expect(reason).toContain("0.1.0-alpha.1");
  expect(reason).toContain("`package.json`");
});

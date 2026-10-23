// Spec `release-evidence`, "Tested Claude Code Version": each copy of the tested Claude Code version names `MIN_CLAUDE_CODE_VERSION` of `tools/limits.ts`.

import { expect, test } from "bun:test";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { MIN_CLAUDE_CODE_VERSION } from "../../tools/limits.ts";
import { REPO } from "../support/repo.ts";

/** The files that name the tested version. The evidence pages of `src/wiki/` keep the version of their run, so they are not copies. */
const COPIES = [
  ".github/workflows/ci.yml",
  ".github/ISSUE_TEMPLATE/bug_report.yml",
  ".github/ISSUE_TEMPLATE/feature_request.yml",
  "README.md",
  "CONTRIBUTING.md",
  "schemas/claude-code-settings.json",
  "schemas/claude-code-managed-settings.json",
  "src/wiki/Home.md",
  "src/wiki/claudetto/Overview.md",
];

const FIXTURES = "tests/claudetto/prompt/fixtures";

/** The names of `texts` that hold no `version`, or a Claude Code version other than `version`. */
const stale = (texts: Record<string, string>, version: string): string[] =>
  Object.entries(texts)
    .filter(
      ([, text]) =>
        !text.includes(version) ||
        (text.match(/\b2\.\d+\.\d{3}\b/g) ?? []).some((v) => v !== version),
    )
    .map(([name]) => name);

test("Stale Pin: a copy that names another version fails, and the failure names the file", () => {
  const texts = {
    "tools/limits.ts": `MIN_CLAUDE_CODE_VERSION = "2.1.309"`,
    "CONTRIBUTING.md": "Install Claude Code 2.1.302.",
  };
  expect(stale(texts, "2.1.309")).toStrictEqual(["CONTRIBUTING.md"]);
});

test("each copy of the tested version and the tool text fixture name `MIN_CLAUDE_CODE_VERSION`", async () => {
  const texts: Record<string, string> = {};
  for (const file of COPIES)
    texts[file] = await Bun.file(path.join(REPO, file)).text();
  texts[FIXTURES] = (await readdir(path.join(REPO, FIXTURES))).join("\n");
  expect(stale(texts, MIN_CLAUDE_CODE_VERSION)).toStrictEqual([]);
});

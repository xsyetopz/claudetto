// `CLAUDE.md` imports `AGENTS.md`, and each file of `.claude/rules/` has a `paths:` list (task 9.6 of change `release-0-3-0-alpha-2`, design D21).
// The overflow lives in the rule files, so it costs nothing at the start of a session.

import { expect, test } from "bun:test";
import path from "node:path";
import { REPO } from "../support/repo.ts";

// 2.1.309 loads only `CLAUDE.md` and `.claude/CLAUDE.md` as project memory (`chunk-kang00hq.js:1290583`), so the import is the one route to `AGENTS.md` (option A of D21).
test("`CLAUDE.md` is the one import `@AGENTS.md`", async () => {
  expect(await Bun.file(path.join(REPO, "CLAUDE.md")).text()).toBe(
    "@AGENTS.md\n",
  );
});

test("each file of `.claude/rules/` starts with a `paths:` list", async () => {
  const dir = path.join(REPO, ".claude/rules");
  const files = [...new Bun.Glob("*.md").scanSync(dir)];
  expect(files.length).toBeGreaterThan(0);
  const without: string[] = [];
  for (const file of files) {
    const text = await Bun.file(path.join(dir, file)).text();
    if (!/^---\npaths:\n {2}- /.test(text)) without.push(file);
  }
  expect(without).toStrictEqual([]);
});

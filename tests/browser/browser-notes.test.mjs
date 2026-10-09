// dotclaude-browser: the hooks module replaces `WebSearch` with the headless browser.
// The lab (`plugins/dotclaude-browser/tests/`) runs the two scenarios of the hook.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.join(import.meta.dirname, "../../plugins/dotclaude-browser");

test("the hooks module is the only module, and it registers `WebSearch`", () => {
  const hooks = JSON.parse(
    fs.readFileSync(path.join(ROOT, "hooks/hooks.json"), "utf8"),
  );
  expect(hooks.modules).toEqual(["./register.mjs"]);
  const register = fs.readFileSync(
    path.join(ROOT, "hooks/register.mjs"),
    "utf8",
  );
  expect(register).toContain('{ tool: "WebSearch" }');
  expect(register).toContain("$.process.run");
});

test("the import graph of the hooks module has no `node:` import", () => {
  const files = [
    "hooks/register.mjs",
    "features/search/search.mjs",
    "features/search/limits.mjs",
  ];
  for (const file of files)
    expect(fs.readFileSync(path.join(ROOT, file), "utf8")).not.toMatch(
      /from "node:|require\(/,
    );
});

test("the skill listing entry has 100 characters or fewer", () => {
  const skill = fs.readFileSync(
    path.join(ROOT, "skills/drive-web-browser/SKILL.md"),
    "utf8",
  );
  const description = skill.match(/^description: (.+)$/m)[1];
  expect(description.length).toBeLessThanOrEqual(100);
});

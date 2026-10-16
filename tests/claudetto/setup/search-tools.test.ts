// The prompt slice allows `Glob` and `Grep`, and the settings that setup plans keep them.
// The local `CLAUDE.md` file of the `claude-md` command is in the git exclude patterns.

import { expect, test } from "bun:test";
import { GIT_EXCLUDE_PATTERNS } from "../../../src/kernel/paths.ts";
import { planSettings } from "../../../src/plugins/claudetto/slices/setup/domain/settings.ts";

type Permissions = { allow?: string[] };

test("the planned settings allow `Glob` and `Grep`", () => {
  const { settings } = planSettings({}, "/plugins/claudetto", {
    withDocs: false,
  });
  const allow = (settings["permissions"] as Permissions).allow;
  expect(allow).toContain("Glob");
  expect(allow).toContain("Grep");
});

test("the planned settings keep the `allow` entries of the user next to `Glob` and `Grep`", () => {
  const { settings } = planSettings(
    { permissions: { allow: ["Bash(mine *)"] } },
    "/plugins/claudetto",
    { withDocs: false },
  );
  const allow = (settings["permissions"] as Permissions).allow;
  expect(allow).toContain("Bash(mine *)");
  expect(allow).toContain("Glob");
  expect(allow).toContain("Grep");
});

test("the git exclude patterns hold `CLAUDE.local.md`", () => {
  expect(GIT_EXCLUDE_PATTERNS).toContain("**/CLAUDE.local.md");
});

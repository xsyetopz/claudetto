// The drift check reports a rule file whose `paths` YAML does not parse or whose globs match no file.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { driftCommand } from "../../../plugins/claudetto/slices/setup/adapters/drift-cmd.ts";
import { driftLines } from "../../../plugins/claudetto/slices/setup/domain/drift.ts";
import { snippetFor } from "../../../plugins/claudetto/slices/setup/domain/merge.ts";
import { RULE_LINES_MAX } from "../../../plugins/claudetto/slices/setup/limits.ts";
import { tmpDir } from "../../support/repo.ts";

test("each rule problem gives one line, and the lines stop at the bound", () => {
  const problems = Array.from({ length: RULE_LINES_MAX + 3 }, (_, i) => ({
    rule: `.claude/rules/r${i}.md`,
    kind: "yaml" as const,
  }));
  const lines = driftLines({ rules: problems });
  expect(lines).toHaveLength(RULE_LINES_MAX + 1);
  expect(lines[0]).toContain(".claude/rules/r0.md");
});

test("no rule problem gives no line", () => {
  expect(driftLines({ rules: [] })).toStrictEqual([]);
});

test("the `drift` command reports a broken rule and passes a good project", async () => {
  const root = "/plugins/claudetto";
  const dir = tmpDir("dc-rules");
  const projectDir = path.join(dir, "project");
  const places = { configDir: path.join(dir, "config"), projectDir, root };
  const rules = path.join(projectDir, ".claude", "rules");
  fs.mkdirSync(rules, { recursive: true });
  fs.mkdirSync(places.configDir, { recursive: true });
  fs.mkdirSync(path.join(projectDir, "src"));
  await Bun.write(path.join(projectDir, "src", "a.ts"), "");
  const settings = JSON.stringify(snippetFor({}, root));
  await Bun.write(path.join(projectDir, ".claude", "settings.json"), settings);
  // The check lists files with the version control tool, so the project needs a repository.
  const init = Bun.spawnSync(["git", "init", "-q"], { cwd: projectDir });
  expect(init.exitCode).toBe(0);
  const out: string[] = [];
  const io = { log: (l: string) => out.push(l), error: () => {} };
  await Bun.write(
    path.join(rules, "good.md"),
    '---\npaths:\n  - "src/**"\n---\nx\n',
  );
  expect(await driftCommand({ scope: "project" }, places, io)).toBe(0);
  await Bun.write(
    path.join(rules, "bad-yaml.md"),
    "---\npaths: [open\n---\nx\n",
  );
  await Bun.write(
    path.join(rules, "no-file.md"),
    '---\npaths: ["lib/**"]\n---\nx\n',
  );
  expect(await driftCommand({ scope: "project" }, places, io)).toBe(1);
  const text = out.join("\n");
  expect(text).toContain(".claude/rules/bad-yaml.md");
  expect(text).toContain("lib/**");
  expect(text).not.toContain("good.md");
});

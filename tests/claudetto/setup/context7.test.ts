// Setup names the official Context7 skill `find-docs` and a Context7 rule next to `claudetto-docs`, and deletes neither (task 7.3a of change `0-3-0`, design D11).

import { expect, test } from "bun:test";
import { mkdir, mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { main } from "../../../plugins/claudetto/slices/setup/adapters/cli.ts";
import { DOCS_SKILL_CHARS } from "../../../plugins/claudetto/slices/setup/prompts.ts";

/** The `description` of the frontmatter of the skill file `text`. */
const description = (text: string): string =>
  (Bun.YAML.parse(text.split(/^---$/m)[1] ?? "") as { description: string })
    .description;

const SKILL =
  "---\nname: find-docs\ndescription: >-\n  Gets docs\n  of a library.\n---\n\nBody.\n";
const RULE = "Use the `ctx7` CLI to fetch current documentation.\n";

test("setup names the `find-docs` skill and the Context7 rule of the user and the project with their sizes, and keeps both files", async () => {
  const home = await mkdtemp(path.join(os.tmpdir(), "context7-"));
  const project = path.join(home, "project");
  const files = [
    path.join(home, "skills", "find-docs", "SKILL.md"),
    path.join(home, "rules", "context7.md"),
    path.join(project, ".claude", "rules", "context7.md"),
  ];
  for (const file of files)
    await mkdir(path.dirname(file), { recursive: true });
  await Bun.write(files[0] as string, SKILL);
  await Bun.write(files[1] as string, RULE);
  await Bun.write(files[2] as string, RULE);
  const lines: string[] = [];
  const io = { log: (l: string) => lines.push(l), error: () => {} };
  const env = { CLAUDE_CONFIG_DIR: home, CLAUDE_PROJECT_DIR: project };
  expect(await main(["--scope", "user", "--apply"], env, project, io)).toBe(0);
  const text = lines.join("\n");
  const sizes = [description(SKILL).length, RULE.length, RULE.length];
  for (const [i, file] of files.entries())
    expect(text).toContain(`${file}: ${sizes[i]} characters`);
  expect(text).toContain(`${DOCS_SKILL_CHARS} characters`);
  for (const file of files) expect(await Bun.file(file).exists()).toBe(true);
});

test("`DOCS_SKILL_CHARS` is the size of the description of `claudetto-docs:find-docs`", async () => {
  const file = "plugins/claudetto-docs/skills/find-docs/SKILL.md";
  expect(DOCS_SKILL_CHARS).toBe(
    description(await Bun.file(file).text()).length,
  );
});

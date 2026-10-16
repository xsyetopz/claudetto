// The skills and the templates of `minispec`: each skill is well formed and names only commands that exist, and a new change of each tier is valid.

import { expect, test } from "bun:test";
import path from "node:path";
import { run } from "../../../plugins/claudetto/slices/minispec/adapters/run.ts";
import { COMMANDS } from "../../../plugins/claudetto/slices/minispec/domain/help.ts";
import { REPO } from "../../support/repo.ts";
import { context, project } from "./store.ts";

const SKILLS = ["minispec", "minispec-apply", "minispec-review"];
const PIPE = { stdout: false, stderr: false, noColorEnv: undefined };

const skill = (name: string) =>
  Bun.file(
    path.join(REPO, "plugins/claudetto/skills", name, "SKILL.md"),
  ).text();

test.each(SKILLS)(
  "the skill `%s` has a matching name, a description, and the CLI as its only tool",
  async (name) => {
    const text = await skill(name);
    const block = /^---\n([\s\S]*?)\n---/.exec(text)?.[1] ?? "";
    expect(block).toContain(`name: ${name}`);
    expect(block).toMatch(/^description: .{20,}/m);
    expect(block).toContain("allowed-tools: Bash(minispec *)");
  },
);

test.each(SKILLS)(
  "the skill `%s` runs only commands that `minispec` has",
  async (name) => {
    const text = await skill(name);
    const used = [
      ...text.matchAll(
        /minispec (new|list|show|status|validate|archive|[a-z]+)\b/g,
      ),
    ]
      .map((m) => m[1] as string)
      .filter(
        (word) => !["change", "changes", "specs", "skill"].includes(word),
      );
    for (const word of used) expect(Object.keys(COMMANDS)).toContain(word);
  },
);

test.each(["medium", "big", "large"])(
  "a new `%s` change passes `validate`",
  async (tier) => {
    const files = project({});
    const make = async () => context(files);
    const made = await run(
      ["new", "x", "--tier", tier, "--capability", "cap"],
      make,
      PIPE,
    );
    expect(made.code).toBe(0);
    const checked = await run(["validate", "x"], make, PIPE);
    expect(checked.err).toBe("");
    expect(checked.code).toBe(0);
  },
);

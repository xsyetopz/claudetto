// Each `SKILL.md` of a plugin fits in the 5,000 tokens that a compaction keeps of a skill that ran, so no skill loses its end (`SKILL_MAX_TOKENS`).

import { expect, test } from "bun:test";
import path from "node:path";
import { CHARS_PER_TOKEN } from "../../plugins/claudetto/modules/session/handoff/limits.ts";
import { SKILL_MAX_TOKENS } from "../../tools/limits.ts";
import { PLUGINS } from "../support/repo.ts";

test("each `SKILL.md` of a plugin has at most `SKILL_MAX_TOKENS` tokens, as `CHARS_PER_TOKEN` characters for each", async () => {
  const files = [...new Bun.Glob("*/skills/*/SKILL.md").scanSync(PLUGINS)];
  expect(files.length).toBeGreaterThan(0);
  const over: string[] = [];
  for (const file of files) {
    const tokens =
      (await Bun.file(path.join(PLUGINS, file)).text()).length /
      CHARS_PER_TOKEN;
    if (tokens > SKILL_MAX_TOKENS) over.push(`${file}: ${Math.ceil(tokens)}`);
  }
  expect(over).toStrictEqual([]);
});

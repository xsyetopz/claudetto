// The step skills of MiniSpec: the frontmatter, which sets the invocation and the tools of each skill.

import { expect, test } from "bun:test";
import path from "node:path";
import { REPO } from "../../support/repo.ts";

const STEPS = ["propose", "apply", "verify", "archive"] as const;
const EXTRA = ["explore", "update", "sync"] as const;

const read = (step: string): Promise<string> =>
  Bun.file(path.join(REPO, `plugins/claudetto/skills/${step}/SKILL.md`)).text();
const skills = Object.fromEntries(
  await Promise.all(STEPS.map(async (s) => [s, await read(s)])),
) as Record<(typeof STEPS)[number], string>;

test.each(STEPS)(
  "the skill `%s` is user-invoked and may call only `minispec`",
  (step) => {
    expect(skills[step]).toMatch(new RegExp(`^name: ${step}$`, "m"));
    expect(skills[step]).toMatch(/^disable-model-invocation: true$/m);
    expect(skills[step]).toMatch(/^allowed-tools: Bash\(minispec \*\)$/m);
  },
);

test.each(EXTRA)(
  "the skill `%s` sets `disable-model-invocation: true`",
  async (name) => {
    const text = await read(name);
    expect(text).toMatch(new RegExp(`^name: ${name}$`, "m"));
    expect(text).toMatch(/^disable-model-invocation: true$/m);
    expect(text).toMatch(/^allowed-tools: Bash\(minispec \*\)$/m);
  },
);

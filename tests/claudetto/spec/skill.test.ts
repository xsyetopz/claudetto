// The four step skills of MiniSpec: the frontmatter, the rule of each preset, and the calls to `minispec`.

import { expect, test } from "bun:test";
import path from "node:path";
import { REPO } from "../../support/repo.ts";

const STEPS = ["propose", "apply", "verify", "archive"] as const;

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

test("the skill `propose` takes a preset and a change", () => {
  expect(skills.propose).toContain(
    'argument-hint: "[task|story|epic] <change or idea>"',
  );
});

test("`tools/vanilla.py` pins the `@fission-ai/openspec` version of `package.json`", async () => {
  const pkg = await Bun.file(path.join(REPO, "package.json")).json();
  const version = pkg.devDependencies["@fission-ai/openspec"];
  const script = await Bun.file(path.join(REPO, "tools/vanilla.py")).text();
  expect(script).toContain(`OPENSPEC = "@fission-ai/openspec@${version}"`);
});

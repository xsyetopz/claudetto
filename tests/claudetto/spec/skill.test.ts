// The step skills of MiniSpec: the frontmatter, which sets the invocation and the tools of each skill.

import { expect, test } from "bun:test";
import path from "node:path";
import { file } from "bun";
import { REPO } from "../../support/repo.ts";

const STEPS = ["propose", "apply", "verify", "archive"] as const;
const EXTRA = ["explore", "update", "sync"] as const;

const read = (step: string): Promise<string> =>
	file(path.join(REPO, `plugins/claudetto/skills/${step}/SKILL.md`)).text();
const skills = new Map(
	await Promise.all(STEPS.map(async (s) => [s, await read(s)] as const)),
);
const DISABLE_MODEL = /^disable-model-invocation: true$/m;
const ALLOW_MINISPEC = /^allowed-tools: Bash\(minispec \*\)$/m;

test.each(STEPS)(
	"the skill `%s` is user-invoked and may call only `minispec`",
	(step) => {
		expect(skills.get(step)).toMatch(new RegExp(`^name: ${step}$`, "m"));
		expect(skills.get(step)).toMatch(DISABLE_MODEL);
		expect(skills.get(step)).toMatch(ALLOW_MINISPEC);
	},
);

test.each(EXTRA)(
	"the skill `%s` sets `disable-model-invocation: true`",
	async (name) => {
		const text = await read(name);
		expect(text).toMatch(new RegExp(`^name: ${name}$`, "m"));
		expect(text).toMatch(DISABLE_MODEL);
		expect(text).toMatch(ALLOW_MINISPEC);
	},
);

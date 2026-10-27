// Each `SKILL.md` of a plugin fits in the 5,000 tokens that a compaction keeps of a skill that ran, so no skill loses its end (`SKILL_MAX_TOKENS`).

import { expect, test } from "bun:test";
import path from "node:path";
import { file as bunFile, Glob } from "bun";
import { CHARS_PER_TOKEN } from "../../plugins/claudetto/modules/session/handoff/limits.ts";
import { SKILL_MAX_TOKENS } from "../../tools/limits.ts";
import { PLUGINS } from "../support/repo.ts";

test("each `SKILL.md` of a plugin has at most `SKILL_MAX_TOKENS` tokens, as `CHARS_PER_TOKEN` characters for each", async () => {
	const files = [...new Glob("*/skills/*/SKILL.md").scanSync(PLUGINS)];
	expect(files.length).toBeGreaterThan(0);
	const texts = await Promise.all(
		files.map((file) => bunFile(path.join(PLUGINS, file)).text()),
	);
	const over = files.flatMap((file, i) => {
		const tokens = (texts[i] ?? "").length / CHARS_PER_TOKEN;
		return tokens > SKILL_MAX_TOKENS ? [`${file}: ${Math.ceil(tokens)}`] : [];
	});
	expect(over).toStrictEqual([]);
});

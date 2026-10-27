// The fault tests of the spec workflow (task 2.1 of change `0-3-0`).
// Each test names its fault of `.claude/claudetto/0.3.0-findings.md` ("fault N") or `research/sessions.md` ("F N"),
// and it failed on `v0.2.0`.
// A test that was `test.failing` before its fix is a `test` now.

import { expect, test } from "bun:test";
import { access } from "node:fs/promises";
import path from "node:path";
import { file as bunFile } from "bun";
import { PLUGINS } from "../../support/repo.ts";

const exists = async (p: string): Promise<boolean> => {
	try {
		await access(p);
		return true;
	} catch {
		return false;
	}
};

const SKILLS = path.join(PLUGINS, "claudetto/skills");

// Fixed by task 8.2 (the step skills and `minispec`).
test("faults 22 and 23: the step skills replace the `spec` skill, and each one adds no description at start", async () => {
	expect(await exists(path.join(SKILLS, "spec"))).toBe(false);
	await Promise.all(
		["propose", "apply", "verify", "archive"].map(async (step) => {
			const file = path.join(SKILLS, step, "SKILL.md");
			expect(await exists(file), step).toBe(true);
			expect(await bunFile(file).text()).toContain(
				"disable-model-invocation: true",
			);
		}),
	);
});

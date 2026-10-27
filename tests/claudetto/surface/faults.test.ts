// The fault tests of the parts that claudetto ships (task 2.1 of change `0-3-0`, spec `lean-surface`).
// Each test names its fault of `.claude/claudetto/0.3.0-findings.md` ("fault N") or `research/sessions.md` ("F N"),
// and it failed on `v0.2.0` (`test.failing`).
// The task that fixes a fault changes its `test.failing` to `test`.

import { expect, test } from "bun:test";
import { stat } from "node:fs/promises";
import path from "node:path";
import { file, JSONC, resolveSync } from "bun";
import { REPO } from "../../support/repo.ts";

const at = async (...parts: string[]) => {
	try {
		await stat(path.join(REPO, ...parts));
		return true;
	} catch {
		return false;
	}
};

// Fixed by task 3.1.
test("faults 18, 46, and 47: the marketplace lists no `claudetto-codegraph`", async () => {
	const market = await file(
		path.join(REPO, ".claude-plugin/marketplace.json"),
	).json();
	const names = market.plugins.map((p: { name: string }) => p.name);
	expect(names).not.toContain("claudetto-codegraph");
	expect(await at("plugins/claudetto-codegraph")).toBe(false);
});

// Fixed by task 3.2.
test("fault 32 and D6: the core plugin ships no `advise` tool and no `patch` skill", async () => {
	expect(await at("plugins/claudetto/slices/advise")).toBe(false);
	expect(await at("plugins/claudetto/skills/patch")).toBe(false);
	expect(await at("plugins/claudetto/bin/claudetto-patch")).toBe(false);
});

interface BiomeConfig {
	linter: {
		rules: {
			complexity?: {
				noExcessiveCognitiveComplexity?: {
					options?: { maxAllowedComplexity?: number };
				};
			};
		};
	};
}

/** Whether `value` has the `linter.rules` object of a Biome config. */
const isBiomeConfig = (value: unknown): value is BiomeConfig =>
	typeof value === "object" &&
	value !== null &&
	"linter" in value &&
	typeof value.linter === "object" &&
	value.linter !== null &&
	"rules" in value.linter;

// Fixed by task 3.5.
test("fault 27: the lint step bounds the cognitive complexity at 15", async () => {
	const root = path.join(REPO, "biome.jsonc");
	const own: unknown = JSONC.parse(await file(root).text());
	const bases =
		typeof own === "object" && own !== null && "extends" in own
			? [own.extends].flat().map((name) => resolveSync(String(name), REPO))
			: [];
	// A rule of the repo file overrides the same rule of an extended config.
	const configs = await Promise.all(
		[root, ...bases].map(async (p) => JSONC.parse(await file(p).text())),
	);
	const bound = configs
		.filter(isBiomeConfig)
		.map(
			(c) =>
				c.linter.rules.complexity?.noExcessiveCognitiveComplexity?.options
					?.maxAllowedComplexity,
		)
		.find((max) => max !== undefined);
	expect(bound).toBe(15);
});

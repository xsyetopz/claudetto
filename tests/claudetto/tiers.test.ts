import { describe, expect, test } from "bun:test";
import { sandboxFaults } from "../../plugins/claudetto/src/sandbox/faults.ts";
import { sandboxSnippet } from "../../plugins/claudetto/src/sandbox/sandbox.ts";
import { compactAt } from "../../plugins/claudetto/src/threshold.ts";
import {
	readTier,
	unknownTierLine,
} from "../../plugins/claudetto/src/tiers/read.ts";
import {
	type Node,
	snippetFaults,
	type TierSnippet,
	tierSnippet,
} from "../../plugins/claudetto/src/tiers/snippet.ts";
import {
	HAIKU_MODEL,
	HAIKU_PRICE_STEP,
	PLAN_CAPS,
	rowFor,
	SNIPPET_ROW,
	TIERS,
} from "../../plugins/claudetto/src/tiers/tiers.ts";
import { describedTools } from "../../plugins/claudetto/src/tools/tools.ts";

// The snippet needs a platform named; `"darwin"` is the development platform, so the snippet carries its `sandbox` block.
const PLATFORM = "darwin";

const envOf = (snippet: TierSnippet): Record<string, Node> => {
	const env = snippet["env"];
	return typeof env === "object" ? { ...env } : {};
};

const login = (rateLimitTier?: string, organizationType?: string) => ({
	oauthAccount: {
		...(rateLimitTier === undefined
			? {}
			: { organizationRateLimitTier: rateLimitTier }),
		...(organizationType === undefined ? {} : { organizationType }),
	},
});

describe("the tier table", () => {
	test("it has one row for each of the three plans", () => {
		expect(TIERS.map((row) => row.tier)).toEqual([
			"claude_pro",
			"default_claude_max_5x",
			"default_claude_max_20x",
		]);
	});

	test("each row id is a key of the plan-cap table the reader uses", () => {
		for (const row of TIERS) {
			expect(Object.hasOwn(PLAN_CAPS, row.tier)).toBe(true);
		}
	});

	test("each row carries the cap its plan has in the plan-cap table", () => {
		for (const row of TIERS) {
			const cap = new Map(Object.entries(PLAN_CAPS)).get(row.tier);

			expect(cap).toBeDefined();
			expect(row.subagentCap).toBe(cap ?? -1);
		}
	});

	test("each row names the models and the effort of the role table", () => {
		for (const row of TIERS) {
			expect(row.subagentModel).toBe("claude-sonnet-5-5");
			expect(row.mainModel).toBe("claude-opus-5-5");
			expect(row.effort).toBe("medium");
		}
	});

	test("each row describes the tools that carry a text of ours", () => {
		for (const row of TIERS) {
			expect(row.describeSet).toEqual(describedTools());
		}
	});

	test("a row writes its models and its effort to the keys they belong to", () => {
		for (const row of TIERS) {
			const snippet = tierSnippet(row, PLATFORM);

			expect(envOf(snippet)).toHaveProperty(
				"CLAUDE_CODE_SUBAGENT_MODEL",
				"claude-sonnet-5-5",
			);
			expect(snippet["model"]).toBe("claude-opus-5-5");
			expect(snippet["effortLevel"]).toBe("medium");
		}
	});

	test("a row that names no model and no effort writes none of the three keys", () => {
		const base = TIERS[0];
		if (base === undefined) {
			throw new Error("the table has no row");
		}

		const snippet = tierSnippet(
			{
				tier: base.tier,
				subagentCap: base.subagentCap,
				contextCap: base.contextCap,
				handoffTokens: base.handoffTokens,
				haiku: base.haiku,
			},
			PLATFORM,
		);

		expect(envOf(snippet)).not.toHaveProperty("CLAUDE_CODE_SUBAGENT_MODEL");
		expect(snippet).not.toHaveProperty("model");
		expect(snippet).not.toHaveProperty("effortLevel");
	});

	// Each of these was built and left unwired: `tierSnippet` wrote the two built-in switches without
	// `permissions.deny`, which is the combination measured at 52,254 characters against 42,879 for a
	// stock run, and no case noticed.
	test("every row writes the deny list, the two prompt surfaces, and the two guarded blocks", () => {
		for (const row of TIERS) {
			const snippet = tierSnippet(row, PLATFORM);

			expect(snippet).toHaveProperty("permissions");
			expect(snippet).toHaveProperty("agent");
			expect(snippet).toHaveProperty("outputStyle");
			expect(snippet).toHaveProperty("autoMode");
			expect(snippet).toHaveProperty("sandbox");
		}
	});

	// `SNIPPET_ROW` is the row the `command.run` hook composes from, because a hooks module cannot read
	// the login's plan. That is only safe while every row gives the same snippet, which `tiers.ts:117`
	// claimed was checked here and nothing checked. A later row that splits a written key by plan now
	// fails here, in place of serving one plan's values to every other plan.
	test("every row gives the snippet of the row the command composes from", () => {
		for (const row of TIERS) {
			expect(tierSnippet(row, PLATFORM)).toEqual(
				tierSnippet(SNIPPET_ROW, PLATFORM),
			);
		}
	});

	// The two guarded blocks are dropped when a fault check finds a fault, and the sandbox check reads
	// the platform, so without this case their coverage would differ by machine.
	test("the two guarded blocks are clean on every platform, so a row writes them anywhere", () => {
		for (const platform of ["darwin", "linux", "win32"]) {
			expect(snippetFaults(platform)).toEqual([]);
			expect(sandboxFaults(sandboxSnippet(), platform)).toEqual([]);
		}
	});

	test("a row that names a subagent model writes it to the environment", () => {
		const base = TIERS[0];
		if (base === undefined) {
			throw new Error("the table has no row");
		}

		const snippet = tierSnippet(
			{ ...base, subagentModel: "claude-haiku-5-5" },
			PLATFORM,
		);

		expect(envOf(snippet)).toHaveProperty(
			"CLAUDE_CODE_SUBAGENT_MODEL",
			"claude-haiku-5-5",
		);
	});
});

describe("the tier read from the login", () => {
	test("a rate-limit tier in the table gives its row", () => {
		const reading = readTier(login("default_claude_max_20x", "claude_max"));

		expect(reading.row).toBe(rowFor("default_claude_max_20x"));
		expect(reading.read).toBe("default_claude_max_20x");
	});

	test("an organization type in the table gives its row when the rate-limit tier is not", () => {
		const reading = readTier(login("something_new", "claude_pro"));

		expect(reading.row?.tier).toBe("claude_pro");
	});

	test("a tier outside the table gives no row and names what was read", () => {
		const reading = readTier(login("default_claude_max_40x", "claude_max"));

		expect(reading.row).toBeUndefined();
		expect(reading.read).toBe("default_claude_max_40x, claude_max");
		expect(unknownTierLine(reading.read)).toContain(
			"default_claude_max_40x, claude_max",
		);
	});

	test("a file with no login gives no row and reads none", () => {
		expect(readTier({})).toEqual({ read: "none" });
		expect(readTier(null)).toEqual({ read: "none" });
	});
});

describe("a Haiku session stays under the price step", () => {
	test("the trigger of each row fires below the step, with the margin it leaves", () => {
		for (const row of TIERS) {
			const pct = Number(
				envOf(tierSnippet(row, PLATFORM))["CLAUDE_AUTOCOMPACT_PCT_OVERRIDE"],
			);

			const fires = compactAt(row.haiku.contextCap, pct);

			expect(fires).toBe(row.haiku.handoffTokens);
			expect(fires).toBeLessThan(HAIKU_PRICE_STEP);
			expect(HAIKU_PRICE_STEP - fires).toBe(10_000);
		}
	});

	test("the Haiku window sits in the per-model settings and not in the global key", () => {
		const row = rowFor("default_claude_max_20x");
		if (row === undefined) {
			throw new Error("the table has no row");
		}

		const snippet = tierSnippet(row, PLATFORM);

		expect(snippet["modelSettings"]).toEqual({
			[HAIKU_MODEL]: { autoCompactWindow: row.haiku.contextCap },
		});
		expect(snippet["autoCompactWindow"]).toBe(row.contextCap);
	});
});

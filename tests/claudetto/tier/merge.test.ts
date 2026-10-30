import { describe, expect, test } from "bun:test";
import { applyTier } from "../../../plugins/claudetto/src/tiers/merge.ts";
import { tierReport } from "../../../plugins/claudetto/src/tiers/report.ts";
import {
	DROPPED_KEYS,
	tierSnippet,
} from "../../../plugins/claudetto/src/tiers/snippet.ts";
import { rowFor, TIERS } from "../../../plugins/claudetto/src/tiers/tiers.ts";
import { shareClaims } from "../../../plugins/claudetto/src/window/report.ts";

const ROW = rowFor("default_claude_max_20x");
if (ROW === undefined) {
	throw new Error("the table has no row for default_claude_max_20x");
}
const PCT = "CLAUDE_AUTOCOMPACT_PCT_OVERRIDE";

/** The `env` names of a snippet, or none where it carries no `env` block. */
const envNames = (env: unknown): string[] =>
	typeof env === "object" && env !== null ? Object.keys(env) : [];

describe("keys a default already covers are left out", () => {
	test("the snippet of each row carries none of them", () => {
		for (const row of TIERS) {
			const snippet = tierSnippet(row);
			const env = snippet["env"];

			for (const dropped of DROPPED_KEYS) {
				expect(envNames(env)).not.toContain(dropped.name);
			}
		}
	});

	test("merging into empty settings writes none of them", () => {
		const applied = applyTier({}, tierSnippet(ROW));

		for (const dropped of DROPPED_KEYS) {
			expect(JSON.stringify(applied.settings)).not.toContain(dropped.name);
		}
	});

	test("each dropped key names the page it was read on", () => {
		for (const dropped of DROPPED_KEYS) {
			expect(dropped.route).not.toBe("");
			expect(dropped.why).not.toBe("");
		}
	});
});

describe("a value the user set stays", () => {
	test("a different value survives and is listed as skipped", () => {
		const current = { autoCompactWindow: 500_000, env: { OTHER: "1" } };

		const applied = applyTier(current, tierSnippet(ROW));

		expect(applied.settings["autoCompactWindow"]).toBe(500_000);
		expect(applied.skipped).toEqual([
			{
				path: "autoCompactWindow",
				why: "set",
				wanted: ROW.contextCap,
				kept: 500_000,
			},
		]);
		expect(applied.written.map((entry) => entry.path)).not.toContain(
			"autoCompactWindow",
		);
	});

	test("the keys around it are still written and the user's other keys stay", () => {
		const current = { autoCompactWindow: 500_000, env: { OTHER: "1" } };

		const applied = applyTier(current, tierSnippet(ROW));

		expect(applied.settings["env"]).toEqual({
			OTHER: "1",
			[PCT]: "50.0000",
			CLAUDE_CODE_SUBAGENT_MODEL: ROW.subagentModel,
		});
	});

	test("a value that already equals the row is not reported", () => {
		const current = { autoCompactWindow: ROW.contextCap };

		const applied = applyTier(current, tierSnippet(ROW));

		expect(applied.skipped).toEqual([]);
		expect(applied.written.map((entry) => entry.path)).not.toContain(
			"autoCompactWindow",
		);
	});
});

describe("an option the user rejected stays rejected", () => {
	test("the rejected path is not written and is listed as skipped", () => {
		const applied = applyTier({}, tierSnippet(ROW), [`env.${PCT}`]);

		expect(applied.settings["env"]).not.toHaveProperty(PCT);
		expect(applied.skipped).toEqual([
			{ path: `env.${PCT}`, why: "rejected", wanted: "50.0000" },
		]);
	});
});

describe("the report of what setup wrote", () => {
	test("it names each key and value written and each key skipped", () => {
		const applied = applyTier({ autoCompactWindow: 500_000 }, tierSnippet(ROW));

		const report = tierReport(ROW.tier, applied);

		expect(report).toContain(`Wrote env.${PCT} = "50.0000".`);
		expect(report).toContain(
			`Wrote modelSettings.claude-haiku-5-5.autoCompactWindow = ${ROW.haiku.contextCap}.`,
		);
		expect(report).toContain("Skipped autoCompactWindow: you set it");
		expect(report).toContain("500000");
	});

	test("it states no share of a plan limit", () => {
		for (const row of TIERS) {
			const applied = applyTier({ autoCompactWindow: 1 }, tierSnippet(row), [
				`env.${PCT}`,
			]);

			expect(shareClaims(tierReport(row.tier, applied))).toEqual([]);
		}
	});

	test("it says so when nothing was written", () => {
		const applied = applyTier(tierSnippet(ROW), tierSnippet(ROW));

		expect(tierReport(ROW.tier, applied)).toContain("Wrote no key.");
	});

	test("the check finds a share when a text carries one", () => {
		expect(shareClaims("This saves 12% of your weekly limit.")).toEqual([
			"12% of your weekly limit",
		]);
	});
});

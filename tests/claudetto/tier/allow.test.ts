import { describe, expect, test } from "bun:test";
import { denyFaults } from "../../../plugins/claudetto/src/deny.ts";
import {
	ALLOW_RULES,
	broadRules,
	flagOpenRules,
	ruleFaults,
} from "../../../plugins/claudetto/src/tiers/allow.ts";
import { applyTier } from "../../../plugins/claudetto/src/tiers/merge.ts";
import {
	cleanBlock,
	denyRules,
	snippetFaults,
	tierSnippet,
} from "../../../plugins/claudetto/src/tiers/snippet.ts";
import { TIERS } from "../../../plugins/claudetto/src/tiers/tiers.ts";

const READ_ONLY_GIT = /^Bash\((git status \*|git (diff|log|show))\)$/;

const row = TIERS[0];
if (row === undefined) {
	throw new Error("the tier table has no row");
}

const keyOf = (permissions: unknown, name: string): unknown =>
	typeof permissions === "object" && permissions !== null
		? Object.entries(permissions).find(([key]) => key === name)?.[1]
		: undefined;

const allowOf = (permissions: unknown): unknown => keyOf(permissions, "allow");

describe("broadRules", () => {
	test("a tool with no content is broad", () => {
		expect(broadRules(["Bash", "Bash()"])).toEqual(["Bash", "Bash()"]);
	});

	test("content of only wildcards is broad", () => {
		expect(broadRules(["Bash(*)", "Bash(* *)", "Read(**)"])).toEqual([
			"Bash(*)",
			"Bash(* *)",
			"Read(**)",
		]);
	});

	test("a wildcard inside the first word of a `Bash` command is broad", () => {
		expect(
			broadRules(["Bash(python*)", "Bash(py*thon -m x)", "Bash(git*)"]),
		).toEqual(["Bash(python*)", "Bash(py*thon -m x)", "Bash(git*)"]);
	});

	test("the legacy prefix form of an interpreter is broad", () => {
		expect(broadRules(["Bash(python:*)"])).toEqual(["Bash(python:*)"]);
	});

	test("a command with a trailing wildcard is narrow", () => {
		expect(
			broadRules(["Bash(git status *)", "Bash(git push:*)", "Read(./src/**)"]),
		).toEqual([]);
	});

	test("only the broad rules of a mixed list are reported, with their text", () => {
		expect(
			broadRules(["Bash(git diff *)", "Bash(*)", "Bash(python*)"]),
		).toEqual(["Bash(*)", "Bash(python*)"]);
	});
});

describe("flagOpenRules", () => {
	test("a wildcard over a command that writes with a flag is flagged", () => {
		expect(
			flagOpenRules([
				"Bash(git diff *)",
				"Bash(git log *)",
				"Bash(git show *)",
			]),
		).toEqual(["Bash(git diff *)", "Bash(git log *)", "Bash(git show *)"]);
	});

	test("the legacy prefix form of such a command is flagged", () => {
		expect(flagOpenRules(["Bash(git diff:*)"])).toEqual(["Bash(git diff:*)"]);
	});

	test("the bare form of such a command is not flagged", () => {
		expect(
			flagOpenRules(["Bash(git diff)", "Bash(git log)", "Bash(git show)"]),
		).toEqual([]);
	});

	test("a wildcard over a command that refuses the flag is not flagged", () => {
		expect(flagOpenRules(["Bash(git status *)"])).toEqual([]);
	});

	test("a rule of another tool is not flagged", () => {
		expect(flagOpenRules(["Read(src/**)", "WebFetch(domain:*.x.com)"])).toEqual(
			[],
		);
	});
});

describe("ruleFaults", () => {
	test("each kind of refused rule gives one line that names it", () => {
		expect(ruleFaults(["Bash(*)", "Bash(git diff *)"])).toEqual([
			"broad allow rule `Bash(*)`",
			"allow rule `Bash(git diff *)` admits a file-writing flag",
		]);
	});

	test("a rule both checks catch is named once", () => {
		expect(ruleFaults(["Bash(git*)"])).toEqual([
			"broad allow rule `Bash(git*)`",
		]);
	});

	test("a list of narrow rules has no fault", () => {
		expect(ruleFaults([...ALLOW_RULES])).toEqual([]);
	});
});

describe("a faulted block is left out of the snippet", () => {
	test("a block with no fault is written whole", () => {
		expect(cleanBlock({ allow: ["Bash(git log)"] }, [])).toEqual({
			allow: ["Bash(git log)"],
		});
	});

	test("a block with a fault writes no key", () => {
		expect(cleanBlock({ allow: ["Bash(*)"] }, ["broad allow rule"])).toEqual(
			{},
		);
	});

	test("the shipped deny list is written and reports no fault", () => {
		const permissions = tierSnippet(row, "darwin")["permissions"];

		expect(denyFaults(denyRules())).toEqual([]);
		expect(keyOf(permissions, "deny")).toEqual([...denyRules()]);
	});
});

describe("the allow list of the snippet", () => {
	test("it is not empty", () => {
		expect(ALLOW_RULES.length).toBeGreaterThan(0);
		expect(allowOf(tierSnippet(row, "darwin")["permissions"])).toEqual([
			...ALLOW_RULES,
		]);
	});

	test("every rule of it passes both guards", () => {
		expect(broadRules(ALLOW_RULES)).toEqual([]);
		expect(flagOpenRules(ALLOW_RULES)).toEqual([]);
		expect(snippetFaults("darwin")).toEqual([]);
	});

	test("every rule of it is a read-only `git` command", () => {
		for (const rule of ALLOW_RULES) {
			expect(rule).toMatch(READ_ONLY_GIT);
		}
	});

	test("`applyTier` keeps the allow list the user already has", () => {
		const own = ["Bash(npm test *)"];
		const applied = applyTier(
			{ permissions: { allow: own } },
			tierSnippet(row, "darwin"),
		);

		expect(allowOf(applied.settings["permissions"])).toEqual(own);
		expect(applied.skipped.map((skip) => skip.path)).toContain(
			"permissions.allow",
		);
	});

	test("`applyTier` writes the allow list into settings that have none", () => {
		const applied = applyTier({}, tierSnippet(row, "darwin"));

		expect(allowOf(applied.settings["permissions"])).toEqual([...ALLOW_RULES]);
	});
});

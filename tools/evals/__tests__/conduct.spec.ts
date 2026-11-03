import { describe, expect, test } from "bun:test";
import { file as bunFile } from "bun";
import {
	type ConductCase,
	conductFaults,
	requirementsOf,
} from "../conduct/inventory.ts";

/** The spec moves out of its change folder once the change is archived. */
const conductSpec = async (): Promise<string> => {
	const synced = bunFile("openspec/specs/agent-conduct/spec.md");
	if (await synced.exists()) {
		return synced.text();
	}
	return bunFile(
		"openspec/changes/release-0-3-0/specs/agent-conduct/spec.md",
	).text();
};

const SPEC = `### Requirement: One

text

### Requirement: Two

text
`;

const caseOf = (requirement: string): ConductCase => ({
	requirement,
	file: "src/blocks/root-prompt/body.ts",
	codes: ["R1"],
	section: "role",
	rule: "a rule",
	scenario: "a scenario",
	passes: "a decision",
	fails: "a failure",
	graders: [{ kind: "tree", check: "a command" }],
});

describe("the conduct inventory", () => {
	test("each rule of the conduct spec has a case or a test, and each case's section exists", async () => {
		expect(await conductFaults(await conductSpec())).toEqual([]);
	});

	test("reads each requirement heading of a spec", () => {
		expect(requirementsOf(SPEC)).toEqual(["One", "Two"]);
	});

	test("a rule with neither a case nor a test is named", async () => {
		expect(await conductFaults(SPEC, [caseOf("One")], {})).toEqual([
			"Two: no eval case",
		]);
	});

	test("a rule settled by a test needs no case", async () => {
		expect(
			await conductFaults(SPEC, [caseOf("One")], { Two: "a.test.ts" }),
		).toEqual([]);
	});

	test("a case naming no rule of the spec is named", async () => {
		expect(
			await conductFaults(SPEC, [caseOf("One"), caseOf("Three")], {
				Two: "a.test.ts",
			}),
		).toEqual(['R1: the spec has no rule "Three"']);
	});

	test("a case whose file is missing is named", async () => {
		const row = { ...caseOf("One"), file: "rules/none.md" };

		expect(await conductFaults(SPEC, [row], { Two: "a.test.ts" })).toEqual([
			"R1: rules/none.md does not exist",
		]);
	});
});

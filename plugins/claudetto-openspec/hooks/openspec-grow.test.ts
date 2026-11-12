import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

import { memory } from "./memory-fs.ts";

const C = "/repo/openspec/changes";
const base =
	"# cap Specification\n\n## Purpose\nA purpose long enough to pass the strict length check here.\n\n## Requirements\n\n### Requirement: Thing\nThe system SHALL x.\n\n#### Scenario: S\n- **WHEN** a\n- **THEN** b\n\n#### Scenario: T\n- **WHEN** c\n- **THEN** d\n";
const scenario = (n: string) =>
	`#### Scenario: ${n}\n- **WHEN** a\n- **THEN** b\n`;
const change = (extra: Record<string, string>) => ({
	[`${C}/c/proposal.md`]: "# P\n",
	[`${C}/c/tasks.md`]: "- [x] 1.1 done\n",
	...extra,
});
const call = async ($: Engine) => {
	const out = await $.tool.call({
		tool: "mcp__claudetto-openspec__openspec",
		change: "c",
	});
	return typeof out.result === "string" ? out.result : "";
};

const sized = (n: number) =>
	`The system SHALL ${"x".repeat(n - "The system SHALL ".length)}`;
const withText = (text: string) =>
	`### Requirement: Thing\n${text}\n\n${scenario("S")}`;

test("A MODIFIED text that grows past 500 characters warns and fails strict", async ($: Engine, on: On) => {
	memory(
		on,
		change({
			[`${C}/c/specs/cap/spec.md`]: `## MODIFIED Requirements\n\n${withText(sized(501))}\n${scenario("T")}`,
			"/repo/openspec/specs/cap/spec.md": base.replace(
				"The system SHALL x.",
				sized(417),
			),
		}),
	);
	const out = await call($);
	expect(out).toContain("c: INVALID");
	expect(out).toContain('MODIFIED "Thing": Requirement text grows past');
});

test("A MODIFIED text that was already over 500 characters gets no length warning", async ($: Engine, on: On) => {
	memory(
		on,
		change({
			[`${C}/c/specs/cap/spec.md`]: `## MODIFIED Requirements\n\n${withText(sized(560))}\n${scenario("T")}`,
			"/repo/openspec/specs/cap/spec.md": base.replace(
				"The system SHALL x.",
				sized(570),
			),
		}),
	);
	const out = await call($);
	expect(out).not.toContain("grows past");
	expect(out).not.toContain("very long");
});

// Spec `prompt-base`, "Plan Line" and "Repository Facts": the plan line and the `repo` block of `prompt.context` (finding X5).

import { expect, test } from "bun:test";
import {
	hasMythos,
	planLine,
	repoFacts,
} from "../../../../plugins/claudetto/modules/session/prompt/domain/facts.ts";
import { FACT_VALUE_MAX_CHARS } from "../../../../plugins/claudetto/modules/session/prompt/limits.ts";

import { GREP_SYSTEM } from "../../../../plugins/claudetto/modules/session/prompt/prompts.ts";

const LONG = "x".repeat(500);

/** A `.claude.json` text whose slots have the write times and the `claude-mythos` values of `slots`. */
const state = (slots: [number, unknown][]): string =>
	JSON.stringify({
		clientDataCacheSlots: Object.fromEntries(
			slots.map(([at, mythos], i) => [
				`bi1-${i}`,
				{ at, data: { cedar_lagoon: { "claude-mythos": mythos } } },
			]),
		),
	});

test("Mythos: the newest slot decides", () => {
	expect(
		hasMythos(
			state([
				[1, false],
				[2, true],
			]),
		),
	).toBe(true);
	expect(
		hasMythos(
			state([
				[2, false],
				[1, true],
			]),
		),
	).toBe(false);
});

test("Mythos: a missing, a broken, or an other-shaped state counts as no access", () => {
	for (const text of [
		"",
		"{",
		"{}",
		'{"clientDataCacheSlots":null}',
		'{"clientDataCacheSlots":{"a":{"data":{"cedar_lagoon":{"claude-mythos":true}}}}}',
		state([[1, "true"]]),
	]) {
		expect(hasMythos(text), text).toBe(false);
	}
});

test("a tier that is empty, unknown, or not a string gives no plan line", () => {
	for (const tier of ["", "enterprise", undefined, 5, "toString"]) {
		expect(planLine(tier)).toBe("");
	}
});

test("the `repo` block with the longest values has 5 lines, and each value is cut at `FACT_VALUE_MAX_CHARS`", () => {
	const text = repoFacts({
		branch: LONG,
		tag: LONG,
		changes: [{ name: LONG, tasks: `- [ ] ${LONG} a` }],
		shell: `/bin/${LONG}`,
		ugrep: true,
	});
	expect(text.split("\n")).toHaveLength(5);
	expect(text).not.toContain("x".repeat(FACT_VALUE_MAX_CHARS + 1));
});

test("a fact that a run did not give is left out, and the `grep` line is always there", () => {
	expect(
		repoFacts({ branch: "", tag: "", changes: [], shell: "", ugrep: false }),
	).toBe(GREP_SYSTEM);
});

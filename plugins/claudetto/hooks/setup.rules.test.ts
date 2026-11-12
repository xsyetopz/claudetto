import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

import {
	choose,
	dismissOn,
	FILE,
	type Lab,
	lab,
	run,
	startup,
} from "./setup.mock.ts";

/** The plugin root the lab's hooks see: the folder above hooks/. */
const ROOT = import.meta.dir.replace(/\/hooks$/u, "");
const CONFIG = "/home/u/.claude";
const RULE_NAMES = [
	"useLeastCode",
	"noUnrequestedEdits",
	"noImpossibleStateGuards",
	"findFactsByExperiment",
	"useOneObviousWay",
	"useBlockLanguage",
	"lookForAClone",
];
const COPY = /^Copy the /u;
const shippedPath = (name: string) => `${ROOT}/rules/${name}.md`;
const installedPath = (name: string) => `${CONFIG}/rules/claudetto/${name}.md`;
const shippedText = (name: string) => `Rule ${name}.`;

/** A lab whose plugin ships every rule, with `pick` answering the dialogs. */
const rulesLab = (
	on: On,
	pick: (question: string) => string = () => "Write",
): Lab => {
	const state = lab(on, "{}", (question) => pick(question));
	for (const name of RULE_NAMES) {
		state.files.set(shippedPath(name), shippedText(name));
	}
	return state;
};

const ruleDialogs = (state: Lab) =>
	state.shown.filter((q) => q.startsWith("Copy the "));

const ruleLogs = (state: Lab) =>
	state.logs.filter((l) => l.includes(" rule is "));

test("each rule the user lacks is a dialog of its own", async ($: Engine, on: On) => {
	const state = rulesLab(on, () => "Skip");

	await run($, "claudetto:setup");

	const asked = ruleDialogs(state);
	expect(asked).toHaveLength(RULE_NAMES.length);
	for (const name of RULE_NAMES) {
		expect(
			asked.filter((q) => q.startsWith(`Copy the ${name} rule`)),
		).toHaveLength(1);
	}
});

test("a rule dialog shows the whole rule and says it loads at session start", async ($: Engine, on: On) => {
	const state = rulesLab(on, () => "Skip");

	await run($, "claudetto:setup");

	const [first] = ruleDialogs(state);
	expect(first).toContain("loads it at its start");
	expect(first).toContain("Rule useLeastCode.");
});

test("a rule the user already holds is not offered", async ($: Engine, on: On) => {
	const state = rulesLab(on);
	state.files.set(installedPath("useLeastCode"), shippedText("useLeastCode"));

	await run($, "claudetto:setup");

	expect(ruleDialogs(state)).toHaveLength(RULE_NAMES.length - 1);
	expect(ruleDialogs(state).some((q) => q.includes("useLeastCode"))).toBe(
		false,
	);
});

test("Write puts the shipped text under rules/claudetto and writes no settings key", async ($: Engine, on: On) => {
	const state = rulesLab(on, choose(COPY, "Write"));

	const out = await run($, "claudetto:setup");

	for (const name of RULE_NAMES) {
		expect(state.files.get(installedPath(name))).toBe(shippedText(name));
		expect(out.text).toContain(installedPath(name));
	}
	expect(state.written.filter((w) => w.path === FILE)).toEqual([]);
});

test("a dismissed rule dialog stops the rest and says so", async ($: Engine, on: On) => {
	const state = rulesLab(
		on,
		dismissOn(/^Copy the noUnrequestedEdits/u, choose(COPY, "Write")),
	);

	const out = await run($, "claudetto:setup");

	expect(ruleDialogs(state)).toHaveLength(2);
	expect(state.files.has(installedPath("useLeastCode"))).toBe(true);
	expect(state.files.has(installedPath("noUnrequestedEdits"))).toBe(false);
	expect(state.files.has(installedPath("noImpossibleStateGuards"))).toBe(false);
	expect(out.text).toBeDefined();
});

test("a shipped rule changed after setup wrote it is logged as updated, once", async ($: Engine, on: On) => {
	const state = rulesLab(on);
	await run($, "claudetto:setup");
	state.files.set(shippedPath("useLeastCode"), "new text");
	state.mtimes.set(shippedPath("useLeastCode"), Date.UTC(2026, 10, 6));

	await startup($);
	await startup($);

	const logs = ruleLogs(state);
	expect(logs).toHaveLength(1);
	expect(logs[0]).toContain("useLeastCode");
	expect(logs[0]).toContain("2026-11-06");
});

test("an edited copy is logged as modified even when the shipped file has the newer date", async ($: Engine, on: On) => {
	const state = rulesLab(on);
	await run($, "claudetto:setup");
	state.files.set(installedPath("useLeastCode"), "mine");
	state.mtimes.set(installedPath("useLeastCode"), Date.UTC(2026, 0, 1));
	state.mtimes.set(shippedPath("useLeastCode"), Date.UTC(2026, 10, 6));

	await startup($);

	const logs = ruleLogs(state);
	expect(logs).toHaveLength(1);
	expect(logs[0]).toContain("useLeastCode");
});

test("a copy with no saved hash that differs is logged as modified", async ($: Engine, on: On) => {
	const state = rulesLab(on);
	state.files.set(installedPath("useLeastCode"), "old");

	await startup($);

	expect(ruleLogs(state).join(",")).toContain("useLeastCode");
});

test("an unchanged copy logs nothing", async ($: Engine, on: On) => {
	const state = rulesLab(on);
	await run($, "claudetto:setup");

	await startup($);

	expect(ruleLogs(state)).toEqual([]);
});

test("a rule never installed logs nothing", async ($: Engine, on: On) => {
	const state = rulesLab(on);

	await startup($);

	expect(ruleLogs(state)).toEqual([]);
});

test("the hooks runtime computes SHA-256 as the setup hash needs it", async () => {
	const digest = await crypto.subtle.digest(
		"SHA-256",
		new Uint8Array(new TextEncoder().encode("abc")),
	);

	expect(
		Array.from(new Uint8Array(digest), (b) =>
			b.toString(16).padStart(2, "0"),
		).join(""),
	).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
});

import type { On } from "claude-code";
import { type Engine, expect, mock, test } from "claude-code/testing";

import { scanned } from "../../secrets.mock";
import {
	choose,
	dismissOn,
	FILE,
	type Lab,
	lab,
	run,
	startup,
} from "./setup.mock";

// Both test runners run on Bun, which sets `import.meta.dir`; `claude plugin validate` types this file without Bun's types.
declare global {
	interface ImportMeta {
		readonly dir: string;
	}
}

/** The plugin root the lab's hooks see: the folder above hooks/. */
const ROOT = import.meta.dir.replace(/\/hooks\/.*$/u, "");
const CONFIG = "/home/u/.claude";
const RULE_NAMES = [
	"useLeastCode",
	"scopeEditsToGoal",
	"guardOnlyTrustBoundaries",
	"findFactsByExperiment",
	"useOneObviousWay",
	"useBlockLanguage",
	"lookForClone",
	"useHeadlineseNames",
	"commentOnlyWhy",
	"useEdgeCaseReport",
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
		dismissOn(/^Copy the scopeEditsToGoal/u, choose(COPY, "Write")),
	);

	const out = await run($, "claudetto:setup");

	expect(ruleDialogs(state)).toHaveLength(2);
	expect(state.files.has(installedPath("useLeastCode"))).toBe(true);
	expect(
		RULE_NAMES.slice(1, 3).some((n) => state.files.has(installedPath(n))),
	).toBe(false);
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

const RULES_DIR = `${CONFIG}/rules/claudetto`;
const DELETE = /^Delete /u;
const isDelete = (question: string) => question.startsWith("Delete ");
const removals = (state: Lab) =>
	state.runs.filter((argv) => argv[0] === "rm").map((argv) => argv.at(-1));

/** A lab whose rules folder holds `names` besides every shipped rule, each shipped rule installed as shipped. */
const strayLab = (
	on: On,
	names: readonly string[],
	pick: (question: string) => string,
): Lab => {
	const state = rulesLab(on, pick);
	for (const name of RULE_NAMES) {
		state.files.set(installedPath(name), shippedText(name));
	}
	on("fs.list", () => ({
		value: [...RULE_NAMES.map((n) => `${n}.md`), ...names].map((name) => ({
			name,
			kind: "file" as const,
			size: 0,
			mtimeMs: 0,
			isLink: false,
		})),
	}));
	return state;
};

test("an installed rule that is not shipped is listed in one dialog and removed on yes", async ($: Engine, on: On) => {
	const state = strayLab(
		on,
		["retiredRule.md", "notes.txt"],
		choose(DELETE, "Delete"),
	);

	await run($, "claudetto:setup");

	const asked = state.shown.filter(isDelete);
	expect(asked).toHaveLength(1);
	expect(asked[0]).toContain("retiredRule.md");
	expect(asked[0]).not.toContain("notes.txt");
	expect(removals(state)).toEqual([`${RULES_DIR}/retiredRule.md`]);
});

test("an installed rule that is not shipped stays on skip", async ($: Engine, on: On) => {
	const state = strayLab(on, ["retiredRule.md"], () => "Skip");

	await run($, "claudetto:setup");

	expect(state.shown.filter(isDelete)).toHaveLength(1);
	expect(removals(state)).toEqual([]);
});

test("no dialog opens when every installed rule is shipped", async ($: Engine, on: On) => {
	const state = strayLab(on, [], () => "Skip");

	await run($, "claudetto:setup");

	expect(state.shown.filter(isDelete)).toEqual([]);
});

/** The stubs of a startup where each rule file reads and then fails its stat with ENOENT; the lines logged fill the array returned. */
const vanishingLab = (on: On): string[] => {
	const logs: string[] = [];
	mock.store(on, {});
	on("classic.SessionStart", () => ({}));
	on("session.version", () => ({
		value: { version: "2.1.318", base: "2.1.318", builtAt: "" },
	}));
	on("env.get", (_$, e) => ({
		value: e.name === "HOME" ? "/home/u" : undefined,
	}));
	on("session.id", () => ({ value: "s-1" }));
	on("session.root", () => ({ value: "/repo" }));
	on("settings.read", () => ({ value: {} }));
	on("fs.exists", (_$, e) => ({ value: e.path.includes("/rules/") }));
	on("fs.read", (_$, e) => ({
		value: e.path.startsWith(ROOT) ? "new" : "old",
	}));
	on("fs.stat", () => {
		throw new Error("ENOENT: no such file or directory");
	});
	on(
		"process.run",
		(_$, e) =>
			scanned(e) ?? {
				value: {
					exitCode: 0,
					stdout: "",
					stderr: "",
					isStdoutTruncated: false,
					isStderrTruncated: false,
				},
			},
	);
	on("ui.log", (_$, e) => {
		logs.push(e.text);
		return { value: undefined };
	});
	return logs;
};

test("a rule file that vanished before its date was read logs nothing", async ($: Engine, on: On) => {
	const logs = vanishingLab(on);

	await startup($);

	expect(logs.filter((l) => l.includes("ENOENT"))).toEqual([]);
});

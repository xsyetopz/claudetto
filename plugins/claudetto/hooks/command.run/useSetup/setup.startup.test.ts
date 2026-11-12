import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

import { lab, logged, run, saved, startup } from "./setup.mock";

const lowVersion = (on: On, version: string) =>
	lab(on, undefined, undefined, undefined, false, version);

test("a startup below the version floor logs a line naming claude update", async ($: Engine, on: On) => {
	const state = lowVersion(on, "2.1.311");

	await startup($);

	expect(logged(state, "claude update", "2.1.323")).not.toEqual([]);
});

test("the floor itself logs nothing about the version", async ($: Engine, on: On) => {
	const state = lowVersion(on, "2.1.323");

	await startup($);

	expect(logged(state, "claude update")).toEqual([]);
});

test("a startup below the version floor logs exactly one line, naming both versions", async ($: Engine, on: On) => {
	const older = lowVersion(on, "2.1.317");

	await startup($);

	const lines = logged(older, "claude update");
	expect(lines).toHaveLength(1);
	expect(lines[0]).toContain("2.1.317");
	expect(lines[0]).toContain("2.1.323");
});

test("a startup without ast-grep logs one notice, and the second logs none", async ($: Engine, on: On) => {
	const state = lab(on);

	await startup($);
	const first = logged(state, "ast-grep").length;
	await startup($);
	const second = logged(state, "ast-grep").length;

	expect(first).toBe(1);
	expect(second).toBe(1);
});

test("ast-grep on the PATH logs nothing at startup", async ($: Engine, on: On) => {
	const state = lab(on);
	state.path = "/bin";
	state.files.set("/bin/ast-grep", "");

	await startup($);

	expect(logged(state, "ast-grep")).toEqual([]);
});

test("a resume logs neither the notice nor the version", async ($: Engine, on: On) => {
	const state = lowVersion(on, "2.1.311");

	await $.classic.SessionStart({ source: "resume" });

	expect(logged(state, "claude update")).toEqual([]);
	expect(logged(state, "ast-grep")).toEqual([]);
});

const floorCases = (label: string, warns: boolean, versions: string[]) => {
	for (const version of versions) {
		test(`${version} at startup ${label}, compared by numeric parts`, async ($: Engine, on: On) => {
			const state = lowVersion(on, version);

			await startup($);

			expect(logged(state, "claude update").length > 0).toBe(warns);
		});
	}
};

floorCases("warns", true, ["2.1.315", "2.1.311-dev"]);
floorCases("adds no line", false, [
	"2.1.330",
	"2.1.1000",
	"2.2.0",
	"3.0.0",
	"dev",
]);

test("setup writes the same minimumVersion that the startup floor warns on", async ($: Engine, on: On) => {
	const state = lowVersion(on, "2.1.315");

	await run($, "claudetto:setup");
	await startup($);

	const floor = saved(state)["minimumVersion"];
	expect(floor).toBe("2.1.323");
	expect(state.logs.some((l) => l.includes(String(floor)))).toBe(true);
});

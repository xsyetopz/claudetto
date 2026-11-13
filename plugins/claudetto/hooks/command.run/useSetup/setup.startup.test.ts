import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

import { lab, logged, startup } from "./setup.mock";

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

test("a resume logs no notice", async ($: Engine, on: On) => {
	const state = lab(on);

	await $.classic.SessionStart({ source: "resume" });

	expect(logged(state, "ast-grep")).toEqual([]);
});

// `/claudetto:setup` is answered in code, so the person reads the report and the model reads
// nothing: the result carries `text` and no `context`, which is what makes the command cost the
// session no tokens. These runs drive the real registration through the engine's own `$.command.run`.
//
// With nothing answering `ui.ask`, this environment has no person to ask, so the call rejects and
// the command keeps nothing, which is the same path a `claude -p` run takes. A test that answers it
// drives the other path, where a kept group reaches `$.fs.write`: the pure functions behind the
// choice are covered by `tests/claudetto/tier/hooks.test.ts`, and what is only testable here is that
// the engine carries an answer of the dialog through to a written file.
//
// Nothing beneath the plugins answers `env.get` here, so each test answers it: the command reads
// `CLAUDE_CONFIG_DIR` and `HOME` to find the settings file.

import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";
import { SETUP_COMMAND } from "../src/tiers/hooks.ts";

/** Answers the two names the command reads: no `CLAUDE_CONFIG_DIR`, so the file is under `HOME`. */
const environment = (on: On): void => {
	on("env.get", (_$, e) => ({
		value: e.name === "HOME" ? "/home/u" : undefined,
	}));
};

/** The engine stamps `origin` and `presentation` on a real run; the test `$` is typed on the whole input, so they are given here as a headless main screen. */
const run = ($: Engine) =>
	$.command.run({
		command: SETUP_COMMAND,
		args: "",
		origin: { kind: "composer" },
		presentation: { isFullscreen: false, columns: 80 },
	});

/** One written file, as `$.fs.write` was called with it. */
interface Written {
	readonly path: string;
	readonly text: string;
}

/**
 * The question of a dialog the engine raised, taken from the tool input.
 *
 * `$.ui.ask` looks its answer up under this exact text, after its own shortening of what the plugin
 * passed, so a stub that answers must key on what arrived and not on the text it sent.
 */
const askedQuestion = (input: object): string => {
	const questions = "questions" in input ? input.questions : undefined;
	const first: unknown = Array.isArray(questions) ? questions[0] : undefined;
	if (typeof first !== "object" || first === null || !("question" in first)) {
		throw new Error("the dialog carried no question");
	}
	const { question } = first;
	if (typeof question !== "string") {
		throw new Error("the dialog's question is no string");
	}
	return question;
};

/**
 * Answers the dialog with `labels` over a settings file holding `{}`, and collects each write.
 *
 * `$.ui.ask` is a `tool.call` of `AskUserQuestion` through every hook but the calling one, so a test
 * answers the dialog by answering that call with the result the tool would have given.
 *
 * `uname -s` is left unanswered, so the platform is unknown and no `sandbox` block is composed, which
 * keeps the written keys the same on any machine running this test.
 */
const answered = (on: On, labels: readonly string[]): readonly Written[] => {
	const files: Written[] = [];
	environment(on);
	on("fs.read", () => ({ value: "{}" }));
	on("fs.write", (_$, e) => {
		files.push({ path: e.path, text: e.text });
		return { value: undefined };
	});
	on("tool.call", { tool: "AskUserQuestion" }, (_$, e) => ({
		result: { answers: { [askedQuestion(e)]: [...labels] } },
	}));
	return files;
};

test("the command is answered in code, so the model is left nothing to read", async ($: Engine, on: On) => {
	environment(on);

	const out = await run($);

	expect(out.context).toBeUndefined();
});

test("with nobody to ask, the command writes nothing and says so", async ($: Engine, on: On) => {
	environment(on);

	const out = await run($);

	expect(out.text ?? "").toContain("Nothing was chosen");
});

test("a kept group is written to the user settings file, and only its keys", async ($: Engine, on: On) => {
	const files = answered(on, ["Smaller prompt"]);

	await run($);

	expect(files.map((file) => file.path)).toEqual([
		"/home/u/.claude/settings.json",
	]);
	expect(
		Object.keys(JSON.parse(files[0]?.text ?? "{}")).toSorted((l, r) =>
			l.localeCompare(r),
		),
	).toEqual([
		"agent",
		"disableBundledSkills",
		"enabledPlugins",
		"outputStyle",
		"permissions",
	]);
});

test("a run that writes a file still leaves the model nothing to read", async ($: Engine, on: On) => {
	answered(on, ["Smaller prompt"]);

	const out = await run($);

	expect(out.context).toBeUndefined();
});

test("two kept groups are written together", async ($: Engine, on: On) => {
	const files = answered(on, ["Smaller prompt", "Models and windows"]);

	await run($);

	expect(Object.keys(JSON.parse(files[0]?.text ?? "{}"))).toContain("model");
	expect(Object.keys(JSON.parse(files[0]?.text ?? "{}"))).toContain(
		"permissions",
	);
});

test("an answer naming no offered group writes nothing", async ($: Engine, on: On) => {
	const files = answered(on, ["something the dialog never offered"]);

	const out = await run($);

	expect(files).toEqual([]);
	expect(out.text ?? "").toContain("Nothing was chosen");
});

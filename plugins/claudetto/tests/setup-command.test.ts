// The result carries `text` and no `context`, so the command costs the session no tokens.

import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";
import { SETUP_COMMAND } from "../src/blocks/setup-command/hooks.ts";

const environment = (on: On): void => {
	on("env.get", (_$, e) => ({
		value: e.name === "HOME" ? "/home/u" : undefined,
	}));
};

const noSettings = (on: On): void => {
	environment(on);
	on("fs.exists", () => ({ value: false }));
};

/** Fields the engine stamps on a real run, given here as a headless main screen. */
const run = ($: Engine) =>
	$.command.run({
		command: SETUP_COMMAND,
		args: "",
		origin: { kind: "composer" },
		presentation: { isFullscreen: false, columns: 80 },
	});

interface Written {
	readonly path: string;
	readonly text: string;
}

interface Dialog {
	readonly question: string;
	readonly labels: readonly string[];
}

/** The stub keys on the question as it arrived, not as sent: `$.ui.ask` shortens it first. */
const dialogOf = (input: object): Dialog => {
	const questions = "questions" in input ? input.questions : undefined;
	const first: unknown = Array.isArray(questions) ? questions[0] : undefined;
	if (typeof first !== "object" || first === null || !("question" in first)) {
		throw new Error("the dialog carried no question");
	}
	const { question } = first;
	if (typeof question !== "string") {
		throw new Error("the dialog's question is no string");
	}
	const options = "options" in first ? first.options : undefined;
	const labels = (Array.isArray(options) ? options : []).map(
		(option: unknown) =>
			typeof option === "object" && option !== null && "label" in option
				? String(option.label)
				: "",
	);
	return { labels, question };
};

interface Run {
	readonly files: readonly Written[];
	readonly asked: readonly Dialog[];
}

/** `asked` is kept because "Nothing was chosen" reads the same for a bad answer and an unanswered dialog. */
const answered = (on: On, labels: readonly string[], held = "{}"): Run => {
	const files: Written[] = [];
	const asked: Dialog[] = [];
	environment(on);
	on("fs.exists", () => ({ value: true }));
	on("fs.read", () => ({ value: held }));
	on("fs.write", (_$, e) => {
		files.push({ path: e.path, text: e.text });
		return { value: undefined };
	});
	on("tool.call", { tool: "AskUserQuestion" }, (_$, e) => {
		const dialog = dialogOf(e);
		asked.push(dialog);
		return { result: { answers: { [dialog.question]: [...labels] } } };
	});
	return { asked, files };
};

test("the command is answered in code, so the model is left nothing to read", async ($: Engine, on: On) => {
	noSettings(on);

	const out = await run($);

	expect(out.context).toBeUndefined();
});

test("with nobody to ask, the command writes nothing and says so", async ($: Engine, on: On) => {
	noSettings(on);

	const out = await run($);

	expect(out.text ?? "").toContain("Nothing was chosen");
});

test("a kept group is written to the user settings file, and only its keys", async ($: Engine, on: On) => {
	const { files } = answered(on, ["Smaller prompt"]);

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
	const { files } = answered(on, ["Smaller prompt"]);

	const out = await run($);

	expect(files).toHaveLength(1);
	expect(out.context).toBeUndefined();
});

test("two kept groups are written together", async ($: Engine, on: On) => {
	const { files } = answered(on, ["Smaller prompt", "Models and windows"]);

	await run($);

	expect(Object.keys(JSON.parse(files[0]?.text ?? "{}"))).toContain("model");
	expect(Object.keys(JSON.parse(files[0]?.text ?? "{}"))).toContain(
		"permissions",
	);
});

test("an answer naming no offered group writes nothing", async ($: Engine, on: On) => {
	const unoffered = "something the dialog never offered";
	const { asked, files } = answered(on, [unoffered]);

	const out = await run($);

	expect(asked).toHaveLength(1);
	expect(asked[0]?.labels ?? []).not.toContain(unoffered);
	expect(files).toEqual([]);
	expect(out.text ?? "").toContain("Nothing was chosen");
});

test("the dialog offers the groups the report then speaks of", async ($: Engine, on: On) => {
	const { asked } = answered(on, ["Sandbox and auto mode"]);

	await run($);

	expect(asked[0]?.labels ?? []).toContain("Sandbox and auto mode");
	expect((asked[0]?.labels ?? []).length).toBeGreaterThanOrEqual(2);
});

test("a settings file that is not valid JSON is left as it is", async ($: Engine, on: On) => {
	const { files } = answered(on, ["Smaller prompt"], '{ "model": "opus",');

	const out = await run($);

	expect(files).toEqual([]);
	expect(out.text ?? "").toContain("nothing was written");
});

// The command is served in code: its dialogs open from the hook, so no model turn and no tool schema is needed.

import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";
import {
	registeredTools,
	USER_RULES,
	userSettingsLab,
} from "../../src/blocks/__tests__/lab-support.ts";
import { CODE_RULES } from "../../src/blocks/setup-command/rules.ts";
import { SETUP_COMMAND } from "../../src/blocks/setup-command/setup.ts";

const FILE = "/home/u/.claude/settings.json";

interface Dialog {
	readonly question: string;
	readonly options: readonly string[];
	readonly multiSelect: boolean;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null;

const dialogOf = (input: object): Dialog => {
	const questions: unknown =
		"questions" in input && Array.isArray(input.questions)
			? input.questions[0]
			: undefined;
	if (!isRecord(questions) || !Array.isArray(questions["options"])) {
		throw new Error("not a dialog");
	}
	return {
		question: String(questions["question"]),
		options: questions["options"].map((option) =>
			isRecord(option) ? String(option["label"]) : "",
		),
		multiSelect: questions["multiSelect"] === true,
	};
};

/** Answers each dialog with the labels `pick` returns. */
const answering = (on: On, pick: (dialog: Dialog) => string): Dialog[] => {
	const shown: Dialog[] = [];
	on("process.run", () => ({
		value: {
			stdout: "Darwin\n",
			stderr: "",
			exitCode: 0,
			isStdoutTruncated: false,
			isStderrTruncated: false,
		},
	}));
	on("tool.call", (_$, e, next) => {
		if (e.tool !== "AskUserQuestion") {
			return next(e);
		}
		const dialog = dialogOf(e);
		shown.push(dialog);
		return { result: { answers: { [dialog.question]: pick(dialog) } } };
	});
	return shown;
};

const run = async ($: Engine): Promise<string> => {
	const out = await $.command.run({
		command: SETUP_COMMAND,
		args: "",
		origin: { kind: "composer" },
		presentation: { isFullscreen: false, columns: 80 },
	});
	return out.text ?? "";
};

test("`session.start` registers no `setup` tool", async ($: Engine, on: On) => {
	const names = await registeredTools($, on);

	expect(names).not.toContain("setup");
});

test("the command answers with `text` alone, so the model gets no turn", async ($: Engine, on: On) => {
	userSettingsLab(on, "{}");
	answering(on, () => "");

	const out = await $.command.run({
		command: SETUP_COMMAND,
		args: "",
		origin: { kind: "composer" },
		presentation: { isFullscreen: false, columns: 80 },
	});

	expect(typeof out.text).toBe("string");
	expect(out.context).toBeUndefined();
});

test("each dialog offers two to four labels", async ($: Engine, on: On) => {
	userSettingsLab(on, "{}");
	const shown = answering(on, () => "");

	await run($);

	expect(shown.length).toBeGreaterThan(1);
	for (const dialog of shown) {
		expect(dialog.options.length).toBeGreaterThanOrEqual(2);
		expect(dialog.options.length).toBeLessThanOrEqual(4);
	}
});

test("only the chosen keys are written to the user settings file", async ($: Engine, on: On) => {
	const files = userSettingsLab(on, '{ "model": "opus" }');
	answering(on, (dialog) =>
		dialog.options
			.filter((o) => o === "model" || o === "effortLevel")
			.join(","),
	);

	const text = await run($);

	expect(files.map((file) => file.path)).toEqual([FILE]);
	const written = JSON.parse(files[0]?.text ?? "{}");
	expect(Object.keys(written)).toEqual(["model", "effortLevel"]);
	expect(written.model).not.toBe("opus");
	expect(text).toContain(`Wrote ${FILE}.`);
	expect(text).toContain("Restart Claude Code");
});

test("the sandbox pair is one single-select dialog", async ($: Engine, on: On) => {
	userSettingsLab(on, "{}");
	const shown = answering(on, () => "");

	await run($);

	const pair = shown.filter((d) => d.options.includes("sandbox.enabled=false"));
	expect(pair).toHaveLength(1);
	expect(pair[0]?.multiSelect).toBe(false);
	expect(pair[0]?.options).toContain("sandbox.enabled");
});

test("no answer writes nothing and says so", async ($: Engine, on: On) => {
	const files = userSettingsLab(on, "{}");
	answering(on, () => "");

	const text = await run($);

	expect(files).toEqual([]);
	expect(text).toContain("was not changed");
});

test("a dismissed dialog writes nothing and says so", async ($: Engine, on: On) => {
	const files = userSettingsLab(on, "{}");
	on("tool.call", (_$, e, next) =>
		e.tool === "AskUserQuestion" ? { result: { answers: {} } } : next(e),
	);

	const text = await run($);

	expect(files).toEqual([]);
	expect(text).toContain("Nothing was written");
});

test("a settings file that is not valid JSON is left as it is", async ($: Engine, on: On) => {
	const files = userSettingsLab(on, '{ "model": "opus",');
	const shown = answering(on, () => "");

	const text = await run($);

	expect(files).toEqual([]);
	expect(shown).toEqual([]);
	expect(text).toContain("nothing was written");
});

const SHIPPED = `<writing_code>
Shipped.
</writing_code>
`;

test("the code rules file is a dialog of its own when the user has none", async ($: Engine, on: On) => {
	userSettingsLab(on, "{}", { shipped: SHIPPED });
	const shown = answering(on, () => "");

	await run($);

	const rules = shown.filter((d) => d.options.includes(CODE_RULES));
	expect(rules).toHaveLength(1);
	expect(rules[0]?.options).toHaveLength(2);
});

test("the code rules file the user already holds is not offered", async ($: Engine, on: On) => {
	userSettingsLab(on, "{}", { held: SHIPPED, shipped: SHIPPED });
	const shown = answering(on, () => "");

	await run($);

	expect(shown.some((d) => d.options.includes(CODE_RULES))).toBe(false);
});

test("keeping the code rules file writes the shipped text to the user rules folder and no settings key", async ($: Engine, on: On) => {
	const files = userSettingsLab(on, "{}", { shipped: SHIPPED });
	answering(on, (dialog) =>
		dialog.options.includes(CODE_RULES) ? CODE_RULES : "",
	);

	const text = await run($);

	expect(files).toEqual([{ path: USER_RULES, text: SHIPPED }]);
	expect(text).toContain(`Wrote ${USER_RULES}.`);
});

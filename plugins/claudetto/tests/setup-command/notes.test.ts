// The dialog of `/claudetto:setup` is drawn with a line under each option that says what that key does for the user.

import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";
import { userSettingsLab } from "../../src/blocks/__tests__/lab-support.ts";
import { SETUP_COMMAND } from "../../src/blocks/setup-command/setup.ts";

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null;

interface Drawn {
	readonly label: string;
	readonly description: string;
}

const drawing = (questions: unknown): readonly Drawn[] => {
	const first = Array.isArray(questions) ? questions[0] : undefined;
	const options: unknown = isRecord(first) ? first["options"] : undefined;
	return Array.isArray(options)
		? options.map((option) => ({
				label: isRecord(option) ? String(option["label"]) : "",
				description: isRecord(option)
					? String(option["description"] ?? "")
					: "",
			}))
		: [];
};

/** Draws each setup dialog the way the host does before it answers, and keeps what the render hook made of it. */
const drawn = (engine: Engine, on: On): Drawn[][] => {
	const seen: Drawn[][] = [];
	on("process.run", () => ({
		value: {
			stdout: "Darwin\n",
			stderr: "",
			exitCode: 0,
			isStdoutTruncated: false,
			isStderrTruncated: false,
		},
	}));
	on("tool.call", async (_$, e, next) => {
		if (e.tool !== "AskUserQuestion") {
			return next(e);
		}
		const questions = "questions" in e ? e.questions : [];
		await engine.ui.render({
			surface: "terminal",
			component: "AskUserQuestion",
			requestId: "q1",
			props: {
				tool: "AskUserQuestion",
				questions: Array.isArray(questions) ? questions : [],
			},
		});
		return { result: { answers: {} } };
	});
	on("ui.render", { component: ["AskUserQuestion"] }, (_$, e) => {
		seen.push([...drawing(e.props.questions)]);
		return { type: "engine", ref: 1 };
	});
	return seen;
};

test("each option of a setup dialog is drawn with its description", async ($: Engine, on: On) => {
	userSettingsLab(on, '{ "model": "opus" }');
	const seen = drawn($, on);

	await $.command.run({
		command: SETUP_COMMAND,
		args: "",
		origin: { kind: "composer" },
		presentation: { isFullscreen: false, columns: 80 },
	});

	expect(seen.length).toBeGreaterThan(0);
	for (const options of seen) {
		for (const option of options) {
			expect(option.description).not.toBe("");
		}
	}
});

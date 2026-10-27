// Stubs of `handover.test.ts`: they record each step in order, so the tests show that the file comes first, then `/clear`, then the prompt.

import type { AgentStatus, BackgroundTaskSummary, On } from "claude-code";
import { type Engine, mock } from "claude-code/testing";
import { isRecord } from "../../modules/jev/domain/jev.ts";
import { MESSAGES } from "./messages.ts";

export const HOUR = 3_600_000;

/** What the stubs answer: `tokens` is the context, `startedAt` the session start, and `agents` the status of each agent. */
export interface World {
	tokens?: number;
	startedAt?: number;
	agents?: AgentStatus[];
	tasks?: string;
	turns?: number;
	answer?: Promise<string> | string;
}

/** The stubs of `fs.write`, `fs.stat`, and `ui.log` that record into `seen`: `failWrite` makes a write throw. */
export const stubFiles = (
	on: On,
	seen: { texts: string[]; logs: string[]; steps?: string[]; paths?: string[] },
	failWrite = false,
) => {
	on("fs.write", (_$, e) => {
		if (failWrite) {
			throw new Error("disk full");
		}
		seen.steps?.push("write");
		seen.paths?.push(e.path);
		seen.texts.push(e.text);
		return { value: undefined };
	});
	on("fs.stat", () => ({
		value: { kind: "file", size: 100, mtimeMs: 0, isLink: false },
	}));
	on("ui.log", (_$, e) => {
		seen.logs.push(e.text);
		return { value: undefined };
	});
};

interface Seen {
	steps: string[];
	paths: string[];
	texts: string[];
	prompts: string[];
	args: string[];
	asks: string[];
	logs: string[];
	models: number;
}

/** The text of the first question of an `AskUserQuestion` call. */
const questionOf = (e: object): string => {
	const questions = "questions" in e ? e.questions : undefined;
	const first = Array.isArray(questions) ? questions[0] : undefined;
	if (!(isRecord(first) && typeof first["question"] === "string")) {
		throw new Error("no question");
	}
	return first["question"];
};

/** `steps` are `write`, `command clear`, and `prompt` in order. */
export const stubs = (on: On, world: World = {}) => {
	const seen: Seen = {
		steps: [],
		paths: [],
		texts: [],
		prompts: [],
		args: [],
		asks: [],
		logs: [],
		models: 0,
	};
	const clock = mock.clock(on, { now: 10 * HOUR });
	mock.env(on, { CLAUDE_PROJECT_DIR: "/p" });
	on("session.messages", () => ({ value: MESSAGES }));
	on("session.turns", () => ({ value: world.turns ?? 2 }));
	on("session.usage", () => ({
		value: {
			startedAt: world.startedAt ?? 9 * HOUR,
			context: { window: 1_000_000, tokens: world.tokens ?? 1000 },
			rateLimits: [],
		},
	}));
	on("agent.list", () => ({
		value: (world.agents ?? []).map((status, i) => ({
			id: `a${i}`,
			description: "",
			type: "claudetto:Hephaestus",
			status,
		})),
	}));
	on("fs.list", () => ({
		value:
			world.tasks === undefined
				? []
				: [{ name: "c", kind: "dir", size: 0, mtimeMs: 0, isLink: false }],
	}));
	on("fs.read", () => {
		if (world.tasks === undefined) {
			throw new Error("ENOENT");
		}
		return { value: world.tasks };
	});
	stubFiles(on, seen);
	on("command.run", (_$, e) => {
		seen.steps.push(`command ${e.command}`);
		seen.args.push(e.args);
		return { text: "" };
	});
	on("prompt.submit", (_$, e) => {
		seen.steps.push("prompt");
		seen.prompts.push(e.text);
		return { text: e.text };
	});
	const zero = { input_tokens: 0, output_tokens: 0 };
	on("model.fork", () => {
		seen.models++;
		return { value: { isAnswered: false, reason: "nothing-to-fork" } };
	});
	on("model.complete", () => {
		seen.models++;
		const usage = {
			...zero,
			cache_read_input_tokens: 0,
			cache_creation_input_tokens: 0,
		};
		return { value: { isAnswered: false, reason: "empty-reply", usage } };
	});
	on("model.classify", () => {
		seen.models++;
		return { value: undefined };
	});
	on("tool.call", async (_$, e, next) => {
		if (e.tool !== "AskUserQuestion") {
			return next(e);
		}
		seen.asks.push(JSON.stringify(e));
		const question = questionOf(e);
		const label = await (world.answer ?? "No");
		return { result: { answers: { [question]: label } } };
	});
	on("classic.Stop", () => ({}));
	on("turn.complete", (_$, e) => ({ text: e.answer }));
	return { seen, clock };
};

/** A `Stop` event with `tasks` in flight in the background. */
export const stop = ($: Engine, tasks: BackgroundTaskSummary[] = []) =>
	$.classic.Stop({ stop_hook_active: false, background_tasks: tasks });

/** The end of a turn of the main thread, which keeps the cache warm. */
export const turnEnd = ($: Engine) =>
	$.turn.complete({
		answer: "Done.",
		durationMs: 1,
		isAborted: false,
		turnId: "t1",
		reason: "answer",
	});

/** A prompt that the user typed in the prompt box. */
export const typed = ($: Engine, text = "Now add the tests.") =>
	$.prompt.submit({ text, wait: false, origin: { kind: "composer" } });

/** The stubs for `world`, a `Stop` event, and the settled clock. */
export const stopped = async ($: Engine, on: On, world: World = {}) => {
	const stubbed = stubs(on, world);
	await stop($);
	await stubbed.clock.settle();
	return stubbed;
};

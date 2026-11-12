import type { On } from "claude-code";
import type { Engine } from "claude-code/testing";

import { scanned } from "../../secrets.mock";

export const FILE = "/home/u/.claude/settings.json";

interface Written {
	path: string;
	text: string;
}

export interface Lab {
	readonly files: Map<string, string>;
	readonly mtimes: Map<string, number>;
	readonly written: Written[];
	readonly shown: string[];
	/** The option labels of each dialog, in the order drawn. */
	readonly offered: (readonly string[])[];
	/** Each prompt Haiku got. */
	readonly prompts: string[];
	/** Haiku's answer text; unset, Haiku does not answer. */
	advice: string | undefined;
	/** The values the betterleaks stub flags. */
	secrets: string[];
	/** Each header, option label, and option description a dialog drew. */
	readonly drawn: string[];
	readonly logs: string[];
	readonly store: Map<string, unknown>;
	readonly runs: (readonly string[])[];
	/** The answer to the Context7 key dialog; `Skip` unless a test types a key. */
	key: string;
	/** The `PATH` the hooks see. */
	path: string | undefined;
	/** The variables the hooks see besides `HOME` and `PATH`. */
	env: Record<string, string>;
}

const emptyLab = (held: string | undefined): Lab => ({
	files: new Map(held === undefined ? [] : [[FILE, held]]),
	mtimes: new Map(),
	written: [],
	shown: [],
	offered: [],
	prompts: [],
	advice: undefined,
	secrets: [],
	drawn: [],
	logs: [],
	store: new Map(),
	runs: [],
	key: "Skip",
	path: undefined,
	env: {},
});

const serveFiles = (on: On, state: Lab, failWrites: boolean) => {
	on("env.get", (_$, e) => ({
		value: { HOME: "/home/u", PATH: state.path, ...state.env }[e.name],
	}));
	on("fs.exists", (_$, e) => ({ value: state.files.has(e.path) }));
	on("fs.read", (_$, e) => {
		const text = state.files.get(e.path);
		if (text === undefined) {
			throw new Error("no file");
		}
		return { value: text };
	});
	on("fs.stat", (_$, e) => ({
		value: {
			kind: "file",
			size: 0,
			mtimeMs: state.mtimes.get(e.path) ?? 0,
			isLink: false,
		},
	}));
	on("fs.write", (_$, e) => {
		if (failWrites) {
			throw new Error("disk full");
		}
		state.written.push({ path: e.path, text: e.text });
		state.files.set(e.path, e.text);
		return { value: undefined };
	});
};

const serveRuns = (
	on: On,
	state: Lab,
	git: (argv: readonly string[]) => string,
) => {
	on("process.run", (_$, e) => {
		const scan = scanned(e, state.secrets);
		if (scan) {
			return scan;
		}
		state.runs.push(e.argv);
		return {
			value: {
				stdout: git(e.argv),
				stderr: "",
				exitCode: 0,
				isStdoutTruncated: false,
				isStderrTruncated: false,
			},
		};
	});
	on("store.get", (_$, e) => ({ value: state.store.get(e.key) }));
	on("store.set", (_$, e) => {
		state.store.set(e.key, e.value);
		return { value: undefined };
	});
};

const serveSession = (on: On, state: Lab, version: string) => {
	on("model.complete", (_$, e) => {
		state.prompts.push(e.prompt);
		const usage = {
			input_tokens: 1,
			output_tokens: 1,
			cache_read_input_tokens: 0,
			cache_creation_input_tokens: 0,
		};
		return {
			value:
				state.advice === undefined
					? {
							isAnswered: false as const,
							reason: "empty-reply" as const,
							usage,
						}
					: { isAnswered: true as const, text: state.advice, usage },
		};
	});
	on("clock.now", () => ({ value: 0 }));
	on("session.version", () => ({
		value: { version, base: version, builtAt: "2026-10-30T00:00:00Z" },
	}));
	on("classic.SessionStart", () => ({}));
	on("command.describe", (_$, e) => ({
		description: e.description,
		isHidden: false,
	}));
	on("session.cwd", () => ({ value: "/p" }));
	on("ui.log", (_$, e) => {
		state.logs.push(e.text);
		return { value: undefined };
	});
};

const serveDialogs = (
	on: On,
	state: Lab,
	pick: (question: string, options: readonly string[]) => string,
) => {
	on("tool.call", (_$, e, next) => {
		if (e.tool !== "AskUserQuestion") {
			return next(e);
		}
		const [first] =
			"questions" in e && Array.isArray(e.questions) ? e.questions : [];
		const question = String(first?.question);
		const options: string[] = (first?.options ?? []).map(
			(o: { label: string }) => o.label,
		);
		state.shown.push(question);
		state.offered.push(options);
		state.drawn.push(
			first?.header ?? "",
			...(first?.options ?? []).flatMap(
				(o: { label: string; description?: string }) => [
					o.label,
					o.description ?? "",
				],
			),
		);
		const answer = question.startsWith("Context7")
			? state.key
			: pick(question, options);
		return { result: { answers: { [question]: answer } } };
	});
};

/** A home at /home/u whose settings file holds `held`, `pick` answering each dialog with its question text. */
export const lab = (
	on: On,
	held?: string,
	pick: (question: string, options: readonly string[]) => string = () =>
		"Write",
	git: (argv: readonly string[]) => string = () => "",
	failWrites = false,
	version = "2.1.323",
): Lab => {
	const state = emptyLab(held);
	serveFiles(on, state, failWrites);
	serveRuns(on, state, git);
	serveSession(on, state, version);
	serveDialogs(on, state, pick);
	return state;
};

export const run = ($: Engine, command: string, args = "") =>
	$.command.run({
		command,
		args,
		origin: { kind: "composer" },
		presentation: { isFullscreen: false, columns: 80 },
	});

export const saved = (state: Lab): Record<string, unknown> => {
	const last = state.written.find((w) => w.path === FILE);
	const parsed: unknown = JSON.parse(last?.text ?? "{}");
	return typeof parsed === "object" && parsed !== null
		? Object.fromEntries(Object.entries(parsed))
		: {};
};

export const startup = ($: Engine) =>
	$.classic.SessionStart({ source: "startup" });

/** The `git` stub of a repo with a Go module. */
export const GO_REPO = (argv: readonly string[]) =>
	argv.includes("rev-parse") ? "true\n" : "go.mod\nmain.go\n";

/** The `git` stub of an empty repo. */
export const EMPTY_REPO = (argv: readonly string[]) =>
	argv.includes("rev-parse") ? "true\n" : "";

export const asked = (state: Lab, word: string) =>
	state.shown.filter((q) => q.includes(word));

export const writtenAt = (state: Lab, path: string) =>
	state.written.find((w) => w.path === path)?.text;

/** The log lines that hold every one of `words`. */
export const logged = (state: Lab, ...words: string[]) =>
	state.logs.filter((l) => words.every((w) => l.includes(w)));

/** An answer for the dialogs whose question matches `pattern`, and `otherwise` for the rest. */
export const choose =
	(pattern: RegExp, answer: string, otherwise = "Skip") =>
	(question: string): string =>
		pattern.test(question) ? answer : otherwise;

/** A dialog whose question matches `pattern` is dismissed; `otherwise` answers the rest. */
export const dismissOn =
	(pattern: RegExp, otherwise: (question: string) => string) =>
	(question: string): string => {
		if (pattern.test(question)) {
			throw new Error("dismissed");
		}
		return otherwise(question);
	};

/** Runs `effect` when a question holds `word`, then answers `answer`. */
export const doOn =
	(word: string, effect: () => void, answer: string) =>
	(question: string): string => {
		if (question.includes(word)) {
			effect();
		}
		return answer;
	};

/** A character the dialog draws as `�` in a label or description: a C0 or C1 control other than tab, or a line or paragraph separator. */
export const isUndrawn = (text: string): boolean => {
	for (const c of text) {
		const n = c.codePointAt(0) ?? 0;
		if (
			(n < 32 && n !== 9) ||
			(n >= 127 && n < 160) ||
			n === 0x20_28 ||
			n === 0x20_29
		) {
			return true;
		}
	}
	return false;
};

/** Whether a dialog holds two to four labels. */
export const isFew = (count: number): boolean => count >= 2 && count <= 4;

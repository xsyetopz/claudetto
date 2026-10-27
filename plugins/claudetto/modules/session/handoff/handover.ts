// The handover (design D12 and D13, spec `handover`): the choice of the path, and the handoff text that code builds with no model call.

import type { SessionMessage } from "claude-code";
import { isRecord } from "../../jev/domain/jev.ts";
import { countTasks, taskEntries } from "../../project/domain/change.ts";
import { proven } from "../../project/domain/checks.ts";
import { COMPACTION_OPTION } from "../domain/compaction.ts";
import { changedFiles, quote } from "./cold.ts";
import { clip } from "./compact.ts";
import {
	type Case,
	COLD_PROMPTS_MAX,
	CONSTRAINT_CHARS_MAX,
	CONSTRAINTS_MAX,
	DECISIONS_MAX,
	ERRORS_MAX,
	GOAL_CHARS_MAX,
	HANDOVER_AGE_MS,
	HANDOVER_CONTEXT_TOKENS,
	PATH_TABLE,
	type Path,
	type PathRow,
	QUESTION_CHARS_MAX,
	READS_MAX,
	TASK_CHARS_MAX,
	USER_VALUE_CHARS_MAX,
	USER_VALUES_MAX,
} from "./limits.ts";
import { HANDOFF_INTRO, HANDOFF_TITLE } from "./prompts.ts";

/** `group` and `before` are the task groups of the next open task now and at the earlier turn end. */
interface TurnEnd {
	readonly tokens: number;
	readonly startedAt: number;
	readonly now: number;
	readonly group: string | null;
	readonly before: string | null;
}

/** The case that a quiet turn end starts, or `null` (triggers 1 and 3 of D12). */
export const caseOf = (end: TurnEnd): Case | null => {
	if (end.tokens > HANDOVER_CONTEXT_TOKENS) {
		return "context";
	}
	if (end.before !== null && end.group !== null && end.before !== end.group) {
		return "group";
	}
	return end.now - end.startedAt > HANDOVER_AGE_MS ? "age" : null;
};

/** The task group of a task id, such as `6` for `6.2`. */
export const groupOf = (id: string | null): string | null =>
	id === null ? null : (id.split(".")[0] ?? null);

const rowOf = (kind: Case, tokens: number, table: readonly PathRow[]) =>
	table.find((row) => row.case === kind && tokens <= row.tokensMax);

/** `built-in` starts no path, `handover` is always a handover, and `auto` reads the first matching row of `table`. */
export const pathOf = (
	kind: Case,
	tokens: number,
	option: unknown,
	table: readonly PathRow[] = PATH_TABLE,
): Path | null => {
	if (option === "built-in" || option === "code") {
		return null;
	}
	if (option === "handover") {
		return "handover";
	}
	return rowOf(kind, tokens, table)?.path ?? "handover";
};

/** The model of the first request step after a handover (spec `handover`, "Model at a Cold Start"), or `null` for the session model. */
export const modelOf = (
	kind: Case,
	tokens: number,
	table: readonly PathRow[] = PATH_TABLE,
): string | null => rowOf(kind, tokens, table)?.model ?? null;

/** One step of a path, in order: the handoff file, `/clear`, `/compact`, the resume prompt, and the held prompt of the user. */
export type Step = "write" | "clear" | "compact" | "resume" | "held";

/** The steps of `path` (spec `handover`, "Path by Measure"). The resume prompt of a handover already holds the held prompt. */
export const stepsOf = (path: Path, held: boolean): Step[] => {
	const after: Step[] = held ? ["held"] : [];
	if (path === "compact") {
		return ["compact", ...after];
	}
	if (path === "handoff-then-compact") {
		return ["write", "compact", ...after];
	}
	return ["write", "clear", "resume"];
};

/** The value of the `compaction` option in `options`, or `auto`. `code` is the compaction that code builds, and it starts no path. */
export const optionOf = (
	options: Readonly<Record<string, unknown>> | undefined,
): string => {
	const value = options?.[COMPACTION_OPTION];
	return value === "handover" || value === "built-in" || value === "code"
		? value
		: "auto";
};

interface Decision {
	readonly question: string;
	readonly chosen: string;
	readonly ruledOut: readonly string[];
}

const ANSWER = /"((?:[^"\\]|\\.)*)"="((?:[^"\\]|\\.)*)"/g;

const labelsOf = (input: unknown, question: string): string[] => {
	const questions = isRecord(input) ? input["questions"] : undefined;
	if (!Array.isArray(questions)) {
		return [];
	}
	const found = questions.find(
		(q) => isRecord(q) && q["question"] === question,
	);
	const options = isRecord(found) ? found["options"] : undefined;
	return Array.isArray(options)
		? options
				.map((o) => (isRecord(o) ? o["label"] : undefined))
				.filter((l): l is string => typeof l === "string")
		: [];
};

/**
 * The answered `AskUserQuestion` calls, in order, the newest `DECISIONS_MAX`.
 * The result text reads `User has answered your questions: "Q"="A".`, and an option other than the chosen ones is ruled out.
 */
export const decisionsOf = (messages: readonly SessionMessage[]): Decision[] =>
	messages
		.flatMap((m) => m.toolUses)
		.filter((use) => use.tool === "AskUserQuestion" && use.isError !== true)
		.flatMap((use) =>
			[...(use.text ?? "").matchAll(ANSWER)].map(
				([, question = "", answer = ""]) => {
					const chosen = answer.split(", ");
					return {
						question,
						chosen: answer,
						ruledOut: labelsOf(use.input, question).filter(
							(label) => !chosen.includes(label) && label !== answer,
						),
					};
				},
			),
		)
		.slice(-DECISIONS_MAX);

/** The sections of a handoff, in order (spec `code-compaction`, "Handoff Format"). */
export const SECTIONS = [
	"## Goal",
	"## Constraints and Pins",
	"## Decisions",
	"## Open Change and Tasks",
	"## Files",
	"## Errors and Fixes",
	"## Checks",
	"## Next Step",
	"## User Messages",
] as const;

const HANDOFF_AT = /^# Handoff$/m;
const NOTES = /<(system-reminder|task-notification)>[\s\S]*?<\/\1>/g;
// The text that Claude Code puts in a user row: the tags of a command, a hook text, a skill body, a caveat, and an interrupt mark.
const TAGGED =
	/^(?:<(?:local-command-[\w-]+|command-(?:name|message|args)|user-prompt-submit-hook|command-std\w+|bash-\w+)\b|Caveat: |Base directory for this skill|Stop hook feedback|\[Request interrupted by user)/;
const COMMAND_NAME = /<command-name>([^<]*)<\/command-name>/;
const COMMAND_ARGS = /<command-args>([^<]*)<\/command-args>/;
const SENTENCE_BREAK = /(?<=[.!?])\s+/;
const SECTION_BREAK = /^(?=## )/m;
const TASK_PREFIX = /^- \[.\] \S+\s*/;
const RULE =
	/\b(?:do not|don['’]t|never|must not|pin|pinned|no more)\b|^(?:please\s+)?(?:only|keep|always)\b/i;

/** True when `text` holds a handoff, as the resume prompt of a handover does. */
const isHandoff = (text: string): boolean => HANDOFF_AT.test(text);

/** The words that the user typed in a user row, or `""`: a slash command is `/name args`, and a note, a reminder, a hook text, and a handoff are no words of the user. */
const typedOf = (m: SessionMessage): string => {
	if (m.role !== "user" || isHandoff(m.text)) {
		return "";
	}
	const name = COMMAND_NAME.exec(m.text)?.[1];
	const args = COMMAND_ARGS.exec(m.text)?.[1]?.trim();
	if (name !== undefined) {
		return args ? `${name} ${args}` : "";
	}
	const plain = m.text.replace(NOTES, "").trim();
	return TAGGED.test(plain) ? "" : plain;
};

const sentencesOf = (text: string): string[] =>
	text
		.split("\n")
		.flatMap((line) => line.split(SENTENCE_BREAK))
		.map((s) => s.trim())
		.filter(Boolean);

const code = (values: readonly string[]): string =>
	values.length === 0 ? "none" : values.map((v) => `\`${v}\``).join(", ");

/** Each value once at its last place, the newest `USER_VALUES_MAX`, so a value typed again counts as new. */
const newestOnce = (values: readonly string[]): string[] =>
	values.filter((v, i) => values.lastIndexOf(v) === i).slice(-USER_VALUES_MAX);

/** The values in backticks of the typed messages, each once, the newest `USER_VALUES_MAX`. */
export const userValuesOf = (messages: readonly SessionMessage[]): string[] =>
	newestOnce(
		messages.flatMap((m) =>
			[...typedOf(m).matchAll(/`([^`\n]+)`/g)].map(([, value = ""]) =>
				clip(value, USER_VALUE_CHARS_MAX),
			),
		),
	);

/** The sections of the last handoff of `messages`, as the non-empty lines of each body by heading, or an empty map. */
const earlierOf = (
	messages: readonly SessionMessage[],
): Map<string, string[]> => {
	const text = messages.findLast((m) => isHandoff(m.text))?.text ?? "";
	const from = text.search(HANDOFF_AT);
	const found = new Map<string, string[]>();
	if (from < 0) {
		return found;
	}
	for (const part of text.slice(from).split(SECTION_BREAK)) {
		const [heading = "", ...lines] = part.split("\n");
		found.set(
			heading,
			lines.filter((line) => line.trim() !== ""),
		);
	}
	return found;
};

const VALUES_LINE = /^Values of the user: (.*)\.$/;

/** The values in backticks of the `Values of the user` line of an earlier handoff, or none. */
const valuesBefore = (lines: readonly string[]): string[] =>
	lines.flatMap((line) =>
		[...(VALUES_LINE.exec(line)?.[1] ?? "").matchAll(/`([^`\n]+)`/g)].map(
			([, value = ""]) => value,
		),
	);

const QUOTED = /^- "(.*)" \(([^()]*)\)$/;
const CLAUDE_MD = /(?:^|\/)CLAUDE\.md$/;

/** The text that the tool calls of `m` wrote into a `CLAUDE.md` file. */
const claudeMdOf = (m: SessionMessage): string[] =>
	m.toolUses.flatMap((use) => {
		const input = isRecord(use.input) ? use.input : {};
		const path = input["file_path"];
		return typeof path === "string" && CLAUDE_MD.test(path)
			? [input["new_string"], input["content"]].filter(
					(v): v is string => typeof v === "string",
				)
			: [];
	});

const USER_LABEL = /^user message (\d+)$/;

/** The rules, each word for word with its source, up to `CONSTRAINTS_MAX`. The order is the rules of an earlier handoff, then the rules of `CLAUDE.md` edits, then the typed rules, oldest first, so the cap drops the newest typed rules. A rule that is there is not added twice. The count of the labels `user message N` goes on from the earlier handoff. */
const rulesOf = (messages: readonly SessionMessage[], earlier: string[]) => {
	const found = new Map<string, string>();
	let n = 0;
	for (const line of earlier) {
		const m = QUOTED.exec(line);
		if (!m) {
			continue;
		}
		found.set(m[1] ?? "", m[2] ?? "");
		n = Math.max(n, Number(USER_LABEL.exec(m[2] ?? "")?.[1] ?? 0));
	}
	const add = (text: string, source: string) => {
		for (const s of sentencesOf(text).filter((t) => RULE.test(t))) {
			const rule = clip(s, CONSTRAINT_CHARS_MAX);
			if (!found.has(rule)) {
				found.set(rule, source);
			}
		}
	};
	for (const m of messages) {
		for (const text of claudeMdOf(m)) {
			add(text, "`CLAUDE.md` edit");
		}
	}
	for (const m of messages) {
		const typed = typedOf(m);
		if (typed !== "") {
			add(typed, `user message ${++n}`);
		}
	}
	return [...found].slice(0, CONSTRAINTS_MAX);
};

const decisionLine = (d: Decision): string =>
	`- ${clip(d.question, QUESTION_CHARS_MAX)} \`${d.chosen}\`${
		d.ruledOut.length > 0 ? ` (ruled out: ${code(d.ruledOut)})` : ""
	}`;

const taskText = (line: string): string =>
	clip(line.replace(TASK_PREFIX, ""), TASK_CHARS_MAX);

/** One state for each task: `done` for a checked box with a passed check, `next` for the next open task, else `open`. */
const tasksOf = (
	name: string | undefined,
	tasks: string | undefined,
	checks: readonly string[],
) => {
	const entries = taskEntries(tasks ?? "");
	const next = tasks === undefined ? null : countTasks(tasks).next;
	const isDone = (e: (typeof entries)[number]) =>
		e.done && proven(e.line, checks);
	const ids = (items: typeof entries) =>
		items.map(
			(e) => `\`${e.id}\`${e.done ? " (box checked, no passed check)" : ""}`,
		);
	const open = entries.filter((e) => !isDone(e) && e.id !== next);
	const done = entries.filter(isDone);
	const nextEntry = entries.find((e) => e.id === next);
	return {
		next: nextEntry,
		body:
			name === undefined || entries.length === 0
				? "No open change."
				: [
						`Change: \`openspec/changes/${name}/\``,
						...(nextEntry
							? [`Next: \`${nextEntry.id}\` ${taskText(nextEntry.line)}`]
							: []),
						...(open.length > 0 ? [`Open: ${ids(open).join(", ")}`] : []),
						...(done.length > 0 ? [`Done: ${ids(done).join(", ")}`] : []),
					].join("\n"),
	};
};

const list = (lines: readonly string[], empty: string, glue = "\n"): string =>
	lines.length === 0 ? empty : lines.join(glue);

/** The read and edited files, newest first, each with the line range of a read. `root` is cut from the start of a path. */
const filesOf = (messages: readonly SessionMessage[], root: string): string => {
	const rel = (path: string) =>
		root !== "" && path.startsWith(root) ? path.slice(root.length) : path;
	const reads = new Map<string, string>();
	for (const use of messages.flatMap((m) => m.toolUses)) {
		const input = isRecord(use.input) ? use.input : undefined;
		const path = input?.["file_path"];
		if (use.tool !== "Read" || typeof path !== "string") {
			continue;
		}
		const offset = input?.["offset"];
		const limit = input?.["limit"];
		const range =
			typeof offset === "number"
				? ` (lines ${offset}-${offset + (typeof limit === "number" ? limit : 2000) - 1})`
				: "";
		reads.delete(rel(path));
		reads.set(rel(path), range);
	}
	return list(
		[
			...changedFiles(messages)
				.reverse()
				.map((p) => `- edited: \`${rel(p)}\``),
			...[...reads]
				.reverse()
				.slice(0, READS_MAX)
				.map(([p, range]) => `- read: \`${p}\`${range}`),
		],
		"No file read or edited.",
	);
};

/** The failed tool calls, newest `ERRORS_MAX`, each marked fixed when a later call of the same command passed. */
const errorsOf = (messages: readonly SessionMessage[]): string => {
	const uses = messages.flatMap((m) => m.toolUses);
	const labelOf = (use: (typeof uses)[number]) => {
		const command = isRecord(use.input) ? use.input["command"] : undefined;
		return use.tool === "Bash" && typeof command === "string"
			? clip(command.trim(), 100)
			: use.tool;
	};
	return list(
		uses
			.flatMap((use, i) =>
				use.isError === true
					? [
							`- \`${labelOf(use)}\` failed: ${clip((use.text ?? "").split("\n")[0] ?? "", 160)}${
								uses
									.slice(i + 1)
									.some(
										(u) =>
											u.isError !== true &&
											u.text !== undefined &&
											labelOf(u) === labelOf(use),
									)
									? " (fixed: a later run passed)"
									: ""
							}`,
						]
					: [],
			)
			.slice(-ERRORS_MAX),
		"No failed tool call.",
	);
};

/** The input of `handoffText`: `name` and `tasks` are the open change and the text of its `tasks.md`, `checks` the passed checks, and `usage` the cost report. */
export interface HandoffInput {
	readonly messages: readonly SessionMessage[];
	readonly name?: string;
	readonly tasks?: string;
	readonly checks?: readonly string[];
	readonly usage?: string;
	readonly root?: string;
}

/** The text of a handoff of `messages` in the 9 `SECTIONS`, built in code with no model call. */
export const handoffText = (input: HandoffInput): string => {
	const { messages, checks = [], usage = "none" } = input;
	const typed = messages.map(typedOf);
	const earlier = earlierOf(messages);
	const rules = rulesOf(messages, earlier.get("## Constraints and Pins") ?? []);
	const ruleSet = new Set(rules.map(([rule]) => rule));
	const state = tasksOf(input.name, input.tasks, checks);
	const decisions = [
		...(earlier.get("## Decisions") ?? []),
		...decisionsOf(messages).map(decisionLine),
	];
	const first = typed.find((t) => t !== "") ?? "";
	const goal = clip(
		(state.next ? `${state.next.id} ${taskText(state.next.line)}` : "") ||
			(earlier.get("## Goal") ?? []).join(" ") ||
			typed.flatMap(sentencesOf).find((s) => !RULE.test(s)) ||
			first.split("\n")[0] ||
			"No goal is known.",
		GOAL_CHARS_MAX,
	);
	const values = newestOnce([
		...valuesBefore(earlier.get("## Constraints and Pins") ?? []),
		...userValuesOf(messages),
	]);
	const recent = typed
		.map((t, i) => ({ n: i, t }))
		.filter(({ t }) => t !== "")
		.map(({ t }, i) => ({
			n: i + 1,
			text: sentencesOf(t)
				.filter((s) => !ruleSet.has(clip(s, CONSTRAINT_CHARS_MAX)))
				.join("\n"),
		}))
		.filter(({ text }) => text !== "")
		.slice(-COLD_PROMPTS_MAX);
	const body: Record<(typeof SECTIONS)[number], string> = {
		"## Goal": goal,
		"## Constraints and Pins": list(
			[
				...rules.map(([rule, source]) => `- "${rule}" (${source})`),
				...(values.length > 0 ? [`Values of the user: ${code(values)}.`] : []),
			],
			"No rule of the user.",
		),
		"## Decisions": list(
			[...new Set(decisions)].slice(-DECISIONS_MAX),
			"No decision.",
		),
		"## Open Change and Tasks": state.body,
		"## Files": filesOf(messages, input.root ?? ""),
		"## Errors and Fixes": errorsOf(messages),
		"## Checks":
			checks.length > 0
				? `Passed: ${code(checks)}.`
				: "No check passed in this session.",
		"## Next Step": state.next
			? `Run task \`${state.next.id}\`: ${taskText(state.next.line)}, then run its check.`
			: "Continue from the last request of the user under `## User Messages`.",
		"## User Messages": list(
			recent.map(({ n, text }) => `Message ${n}:\n${quote([text])}`),
			"No other message of the user.",
			"\n\n",
		),
	};
	return [
		HANDOFF_TITLE,
		"",
		HANDOFF_INTRO,
		...(usage === "none" ? [] : ["", usage]),
		...SECTIONS.flatMap((s) => ["", s, body[s]]),
		"",
	].join("\n");
};

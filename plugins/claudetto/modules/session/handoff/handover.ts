// The handover (design D12 and D13, spec `handover`): the choice of the path, and the handoff text that code builds with no model call.

import type { SessionMessage } from "claude-code";
import { isRecord } from "../../jev/domain/jev.ts";
import { COMPACTION_OPTION } from "../domain/compaction.ts";
import { quote } from "./cold.ts";
import { clip, spread } from "./compact.ts";
import {
	type Case,
	COLD_PROMPTS_MAX,
	CONSTRAINT_CHARS_MAX,
	DECISIONS_TOKENS,
	GOAL_CHARS_MAX,
	HANDOVER_AGE_MS,
	HANDOVER_CONTEXT_TOKENS,
	PATH_TABLE,
	type Path,
	type PathRow,
	QUESTION_CHARS_MAX,
	USER_VALUE_CHARS_MAX,
	VALUES_TOKENS,
} from "./limits.ts";
import { HANDOFF_INTRO, HANDOFF_TITLE } from "./prompts.ts";
import {
	errorsOf,
	filesOf,
	list,
	runningOf,
	tasksOf,
	taskText,
} from "./sections.ts";
import {
	earlierOf,
	newestOnce,
	RULE,
	rulesOf,
	sentencesOf,
	typedOf,
	valuesBefore,
} from "./typed.ts";

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
 * The answered `AskUserQuestion` calls, in order.
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
		);

/** The sections of a handoff, in order (spec `code-compaction`, "Handoff Format"). */
export const SECTIONS = [
	"## Goal",
	"## Constraints and Pins",
	"## Decisions",
	"## Open Change and Tasks",
	"## Files",
	"## Errors and Fixes",
	"## Checks",
	"## Running Work",
	"## Next Step",
	"## User Messages",
] as const;

const code = (values: readonly string[]): string =>
	values.length === 0 ? "none" : values.map((v) => `\`${v}\``).join(", ");

/** The values in backticks of the typed messages, each once. */
export const userValuesOf = (messages: readonly SessionMessage[]): string[] =>
	newestOnce(
		messages.flatMap((m) =>
			[...typedOf(m).matchAll(/`([^`\n]+)`/g)].map(([, value = ""]) =>
				clip(value, USER_VALUE_CHARS_MAX),
			),
		),
	);

const decisionLine = (d: Decision): string =>
	`- ${clip(d.question, QUESTION_CHARS_MAX)} \`${d.chosen}\`${
		d.ruledOut.length > 0 ? ` (ruled out: ${code(d.ruledOut)})` : ""
	}`;

/** The input of `handoffText`: `name` and `tasks` are the open change and the text of its `tasks.md`, `checks` the passed checks, and `usage` the cost report. */
export interface HandoffInput {
	readonly messages: readonly SessionMessage[];
	readonly name?: string;
	readonly tasks?: string;
	readonly checks?: readonly string[];
	readonly usage?: string;
	readonly root?: string;
}

/** The text of a handoff of `messages` in the 10 `SECTIONS`, built in code with no model call. */
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
	const values = spread(
		newestOnce([
			...valuesBefore(earlier.get("## Constraints and Pins") ?? []),
			...userValuesOf(messages),
		]),
		VALUES_TOKENS,
		(v) => `\`${v}\`, `,
	);
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
			spread([...new Set(decisions)], DECISIONS_TOKENS, (d) => d),
			"No decision.",
		),
		"## Open Change and Tasks": state.body,
		"## Files": filesOf(messages, input.root ?? ""),
		"## Errors and Fixes": errorsOf(messages),
		"## Checks":
			checks.length > 0
				? `Passed: ${code(checks)}.`
				: "No check passed in this session.",
		"## Running Work": runningOf(messages),
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

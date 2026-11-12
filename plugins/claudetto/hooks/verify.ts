import type { SessionMessage, ToolUseSummary } from "claude-code";

import type { GradeFault } from "./texts-grade.ts";

export const ASK_TOOL = "AskUserQuestion";

// A tool call that is not a lookup of the tool list does not ground a claim; every other call looked at the workspace.
const NOT_A_LOOK = new Set(["ToolSearch"]);

// Tool results and injected text come back as user messages; only the person's own words count.
export const isPersonMessage = (m: SessionMessage): boolean =>
	m.role === "user" &&
	m.text !== "" &&
	(m.toolResults?.length ?? 0) === 0 &&
	!m.text.startsWith("<");

/** How many earlier person messages the grader sees as the record of what the user said. */
const EARLIER = 30;

/** How many earlier assistant messages the grader sees as what the user was shown. */
const SHOWN = 6;

/** How many of the turn's latest tool results the grader sees, and how many characters of each. */
const RESULTS = 8;
const RESULT_CHARS = 400;

const resultLine = (use: ToolUseSummary): string => {
	const arg = [
		use.input["command"],
		use.input["file_path"],
		use.input["pattern"],
	].find((v) => typeof v === "string");
	return `- ${use.tool} ${(arg ?? "").slice(0, 120)}\n${(use.text ?? "").slice(0, RESULT_CHARS)}`;
};

const popupAnswers = (
	messages: readonly SessionMessage[],
	denied: ReadonlySet<string>,
): string[] =>
	messages
		.flatMap((m) => m.toolUses)
		.filter(
			(use) =>
				use.tool === ASK_TOOL &&
				use.text !== undefined &&
				!use.isError &&
				!denied.has(use.tool_use_id),
		)
		.map((use) => `Popup answer: ${use.text}`);

/**
 * The person's message that opened the turn, the person messages before it, and whether any call since then looked at the workspace.
 * A call in `denied` was refused before it ran, so it saw nothing. `failed` is the turn's last Bash result when it is an error, else "".
 */
export const claimTurn = (
	messages: readonly SessionMessage[],
	denied: ReadonlySet<string> = new Set(),
) => {
	const start = messages.findLastIndex((item) => isPersonMessage(item));
	const turnUses = messages.slice(start + 1).flatMap((m) => m.toolUses);
	const lastRun = turnUses.findLast(
		(use) =>
			use.tool === "Bash" &&
			use.text !== undefined &&
			!denied.has(use.tool_use_id),
	);
	return {
		user: start === -1 ? "" : (messages[start]?.text ?? ""),
		people: [
			...messages
				.slice(0, Math.max(start, 0))
				.filter((item) => isPersonMessage(item))
				.slice(-EARLIER)
				.map((m) => m.text),
			// A popup answer is the person's choice too, in this turn as much as before it.
			...popupAnswers(messages, denied),
		],
		shown: messages
			.slice(0, Math.max(start, 0))
			.filter((m) => m.role === "assistant" && m.text !== "")
			.slice(-SHOWN)
			.map((m) => m.text),
		looked: turnUses.some(
			(use) => !(NOT_A_LOOK.has(use.tool) || denied.has(use.tool_use_id)),
		),
		results: turnUses
			.filter((use) => use.text !== undefined && !NOT_A_LOOK.has(use.tool))
			.slice(-RESULTS)
			.map((item) => resultLine(item)),
		failed: lastRun?.isError ? resultLine(lastRun) : "",
	};
};

const squash = (text: string): string => text.replaceAll(/\s+/gu, " ");

/**
 * The fault codes in a grader answer, read structurally: a JSON `faults` list whose entries name a code in `allowed` and quote words that stand in
 * the reply. A quote the reply does not hold is a made-up finding, so it is dropped; an unreadable answer throws.
 */
export const parseFaults = (
	text: string,
	allowed: readonly GradeFault[],
	reply: string,
): GradeFault[] => {
	const json: unknown = JSON.parse(
		text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1),
	);
	const list =
		typeof json === "object" && json !== null && "faults" in json
			? json.faults
			: undefined;
	const found = new Set(
		(Array.isArray(list) ? list : []).flatMap((entry: unknown) =>
			typeof entry === "object" &&
			entry !== null &&
			"code" in entry &&
			"quote" in entry &&
			typeof entry.quote === "string" &&
			entry.quote.trim() !== "" &&
			squash(reply).includes(squash(entry.quote).trim())
				? [entry.code]
				: [],
		),
	);
	return allowed.filter((code) => found.has(code));
};

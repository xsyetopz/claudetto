import type { SessionMessage } from "claude-code";
import type { GradeFault } from "./texts.ts";

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

/** The person's message that opened the turn, the person messages before it, and whether any call since then looked at the workspace. */
export const claimTurn = (messages: readonly SessionMessage[]) => {
	const start = messages.findLastIndex(isPersonMessage);
	return {
		user: start < 0 ? "" : (messages[start]?.text ?? ""),
		people: messages
			.slice(0, Math.max(start, 0))
			.filter(isPersonMessage)
			.slice(-EARLIER)
			.map((m) => m.text),
		shown: messages
			.slice(0, Math.max(start, 0))
			.filter((m) => m.role === "assistant" && m.text !== "")
			.slice(-SHOWN)
			.map((m) => m.text),
		looked: messages
			.slice(start + 1)
			.some((m) => m.toolUses.some((use) => !NOT_A_LOOK.has(use.tool))),
		results: messages
			.slice(start + 1)
			.flatMap((m) => m.toolUses)
			.filter((use) => use.text !== undefined && !NOT_A_LOOK.has(use.tool))
			.slice(-RESULTS)
			.map((use) => {
				const arg = [
					use.input.command,
					use.input.file_path,
					use.input.pattern,
				].find((v) => typeof v === "string");
				return `- ${use.tool} ${String(arg ?? "").slice(0, 120)}\n${(use.text ?? "").slice(0, RESULT_CHARS)}`;
			}),
	};
};

const squash = (text: string): string => text.replace(/\s+/g, " ");

/**
 * The fault codes in a grader answer, read structurally: a JSON `faults` list whose entries name a code in `allowed` and quote words that stand in
 * the reply. A quote the reply does not hold is a made-up finding, so it is dropped; an unreadable answer holds none.
 */
export const parseFaults = (
	text: string,
	allowed: readonly GradeFault[],
	reply: string,
): GradeFault[] => {
	try {
		const json: unknown = JSON.parse(
			text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1),
		);
		const list =
			typeof json === "object" && json !== null && "faults" in json
				? json.faults
				: undefined;
		const found = (Array.isArray(list) ? list : []).flatMap((entry: unknown) =>
			typeof entry === "object" &&
			entry !== null &&
			"code" in entry &&
			"quote" in entry &&
			typeof entry.quote === "string" &&
			entry.quote.trim() !== "" &&
			squash(reply).includes(squash(entry.quote).trim())
				? [entry.code]
				: [],
		);
		return allowed.filter((code) => found.includes(code));
	} catch {
		return [];
	}
};

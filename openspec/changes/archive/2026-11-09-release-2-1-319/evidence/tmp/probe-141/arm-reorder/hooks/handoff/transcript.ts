import type { SessionMessage } from "claude-code";

import { BUILT_BY_CODE, HANDOFF_DIR, HANDOFF_NAME, layout } from "./layout.ts";

const TURNS = 12;
const PATHS = 20;
const PROMPTS = 100;
const CUT = 600;

interface Tail {
	readonly turns: readonly { readonly role: string; readonly text: string }[];
	readonly paths: readonly string[];
	readonly written: readonly string[];
	readonly decisions: readonly string[];
}

const WRITING_TOOLS = ["Write", "Edit", "NotebookEdit"];

const pathOf = (input: Record<string, unknown>): string | undefined =>
	[input["file_path"], input["notebook_path"], input["path"]].find(
		(value): value is string => typeof value === "string" && value !== "",
	);

const shorten = (text: string): string =>
	text.length <= CUT ? text : `${text.slice(0, CUT)}…`;

export const readMessages = (messages: readonly SessionMessage[]): Tail => {
	const touches = messages.flatMap((message) =>
		message.toolUses.flatMap((use) => {
			const path = pathOf(use.input);
			return path === undefined ? [] : [{ path, tool: use.tool }];
		}),
	);
	return {
		turns: messages
			.map((message) => ({ role: message.role, text: message.text }))
			.filter((turn) => turn.text !== ""),
		paths: [...new Set(touches.map((touch) => touch.path))],
		written: touches
			.filter((touch) => WRITING_TOOLS.includes(touch.tool))
			.map((touch) => touch.path),
		decisions: messages
			.flatMap((message) => message.toolUses)
			.filter((use) => use.tool === "AskUserQuestion" && use.text !== undefined)
			.map((use) => shorten(use.text ?? "")),
	};
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null;

const lineOf = (line: string): unknown => {
	try {
		return JSON.parse(line);
	} catch {
		return undefined;
	}
};

/**
 * The prompts the user typed, from the whole transcript file. An entry stamped `origin.kind` `human` counts;
 * an entry of an older transcript, with no stamp, counts when it is no meta line and its text is no tag.
 */
export const humanPrompts = (jsonl: string): string[] =>
	jsonl.split("\n").flatMap((line) => {
		const entry = lineOf(line);
		if (
			!isRecord(entry) ||
			entry["type"] !== "user" ||
			entry["isSidechain"] === true
		) {
			return [];
		}
		const origin = entry["origin"];
		const message = entry["message"];
		const content = isRecord(message) ? message["content"] : undefined;
		const isHuman = isRecord(origin)
			? origin["kind"] === "human"
			: entry["isMeta"] !== true &&
				typeof content === "string" &&
				!content.startsWith("<");
		return isHuman && typeof content === "string" && content.trim() !== ""
			? [content.trim()]
			: [];
	});

/** Only a writing tool counts: a read of the injected handoff is not a new one. */
export const ownHandoffs = (
	tail: Tail,
): { readonly valid: boolean; readonly misnamed: string | undefined } => {
	const own = tail.written.filter((path) => path.includes(HANDOFF_DIR));
	const name = (path: string): boolean =>
		HANDOFF_NAME.test(path.replaceAll("\\", "/").split("/").at(-1) ?? "");
	return {
		valid: own.some(name),
		misnamed: own.findLast((path) => !name(path)),
	};
};

const quoted = (text: string): string[] =>
	shorten(text)
		.split("\n")
		.map((line) => (line === "" ? ">" : `> ${line}`));

const NONE = ["None found in the transcript.", ""];

const listed = (items: readonly string[]): string[] =>
	items.length === 0
		? NONE
		: [...items.flatMap((item) => [...quoted(item), ""])];

/** Empty for a transcript with no user turn, so the caller writes nothing. */
export const handoffText = (
	tail: Tail,
	prompts: readonly string[],
	startedAt: string,
): string => {
	const turns = tail.turns.slice(-TURNS);
	if (!turns.some((turn) => turn.role === "user")) {
		return "";
	}
	const paths = tail.paths.slice(-PATHS).map((path) => `- \`${path}\``);
	const filled: Readonly<Record<string, string[]>> = {
		"Standing instructions": listed(prompts.slice(-PROMPTS)),
		"Decisions log": listed(tail.decisions),
		"Current state": turns.flatMap((turn) => [
			`**${turn.role === "user" ? "User" : "Claude"}:**`,
			"",
			...quoted(turn.text),
			"",
		]),
		"Key files and symbols": paths.length > 0 ? [...paths, ""] : NONE,
	};
	return layout(
		`${BUILT_BY_CODE} from the transcript at ${startedAt}, with no model call.`,
		(section) => filled[section] ?? NONE,
	);
};

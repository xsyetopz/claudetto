import type { SessionMessage } from "claude-code";

import { isRecord, isWriter } from "../tools.ts";
import {
	BUILT_BY_CODE,
	gitLines,
	HANDOFF_DIR,
	HANDOFF_NAME,
	layout,
} from "./layout.ts";

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

export const pathOf = (input: Record<string, unknown>): string | undefined =>
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
			.filter((touch) => isWriter(touch.tool))
			.map((touch) => touch.path),
		decisions: messages
			.flatMap((message) => message.toolUses)
			.filter((use) => use.tool === "AskUserQuestion" && use.text !== undefined)
			.map((use) => shorten(use.text ?? "")),
	};
};

export const lineOf = (
	line: string,
	log: (message: string) => void,
): unknown => {
	if (line.trim() === "") {
		return undefined;
	}
	try {
		return JSON.parse(line);
	} catch (error) {
		log(`A transcript line did not parse (${String(error)})`);
		return undefined;
	}
};

/**
 * The prompts the user typed, from the whole transcript file. An entry stamped `origin.kind` `human` counts;
 * an entry of an older transcript, with no stamp, counts when it is no meta line and its text is no tag.
 */
export const humanPrompts = (
	jsonl: string,
	log: (message: string) => void,
): string[] =>
	jsonl.split("\n").flatMap((line) => {
		const entry = lineOf(line, log);
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

const isHandoffName = (path: string): boolean =>
	HANDOFF_NAME.test(path.replaceAll("\\", "/").split("/").at(-1) ?? "");

/** Only a writing tool counts: a read of the injected handoff is not a new one. */
export const ownHandoffs = (
	tail: Tail,
): { readonly valid: boolean; readonly misnamed: string | undefined } => {
	const own = tail.written.filter((path) => path.includes(HANDOFF_DIR));
	return {
		valid: own.some((element) => isHandoffName(element)),
		misnamed: own.findLast((path) => !isHandoffName(path)),
	};
};

const quoted = (text: string): string[] =>
	shorten(text)
		.split("\n")
		.map((line) => (line === "" ? ">" : `> ${line}`));

const turnLines = (turn: Tail["turns"][number]): string[] => [
	`**${turn.role === "user" ? "User" : "Claude"}:**`,
	"",
	...quoted(turn.text),
	"",
];

const NONE = ["None found in the transcript.", ""];

const listed = (items: readonly string[]): string[] => {
	if (items.length === 0) {
		return NONE;
	}
	const lines: string[] = [];
	for (const item of items) {
		lines.push(...quoted(item), "");
	}
	return lines;
};

/** Empty for a transcript with no user turn, so the caller writes nothing. */
export const handoffText = (
	tail: Tail,
	prompts: readonly string[],
	startedAt: string,
	git: string,
): string => {
	const turns = tail.turns.slice(-TURNS);
	if (!turns.some((turn) => turn.role === "user")) {
		return "";
	}
	const paths = tail.paths.slice(-PATHS).map((path) => `- \`${path}\``);
	const filled: Readonly<Record<string, string[]>> = {
		"Standing Instructions": listed(prompts.slice(-PROMPTS)),
		"Decisions Log": listed(tail.decisions),
		"Current State": [
			...gitLines(git, startedAt),
			...turns.flatMap((turn) => turnLines(turn)),
		],
		"Key Files And Symbols": paths.length > 0 ? [...paths, ""] : NONE,
	};
	return layout(
		`${BUILT_BY_CODE} from the transcript at ${startedAt}, with no model call.`,
		(section) => filled[section] ?? NONE,
	);
};

import type { SessionMessage } from "claude-code";
import { redact } from "../../shared/secrets/redact.ts";

export const HANDOFF_DIR = ".claude/claudetto/handoffs";

const TURNS = 12;

const PATHS = 20;

const CUT = 600;

/** The session-end reason that asks for a handoff: the conversation ends and the process goes on. */
export const CLEAR = "clear";

export interface Turn {
	readonly role: string;
	readonly text: string;
}

/** `written` stays unredacted: `wroteOwn` matches the handoff folder inside it. */
export interface Tail {
	readonly turns: readonly Turn[];
	readonly paths: readonly string[];
	readonly written: readonly string[];
}

// Fields are `unknown`: a guard must not assert more than it checked of a file we do not own.

interface ToolInput {
	readonly file_path?: unknown;
	readonly notebook_path?: unknown;
	readonly path?: unknown;
}

const isObject = <T>(value: unknown): value is T =>
	typeof value === "object" && value !== null;

const asText = (value: unknown): string | undefined =>
	typeof value === "string" && value !== "" ? value : undefined;

const pathOf = (input: unknown): string | undefined => {
	if (!isObject<ToolInput>(input)) {
		return undefined;
	}
	return (
		asText(input.file_path) ?? asText(input.notebook_path) ?? asText(input.path)
	);
};

const WRITING_TOOLS = ["Write", "Edit", "MultiEdit", "NotebookEdit"];

interface Touch {
	readonly path: string;
	readonly wrote: boolean;
}

const touchesIn = (message: SessionMessage): readonly Touch[] =>
	message.toolUses
		.map((use) => {
			const path = pathOf(use.input);
			return path === undefined
				? undefined
				: { path, wrote: WRITING_TOOLS.includes(use.tool) };
		})
		.filter((touch): touch is Touch => touch !== undefined);

/** Redacts at the read; `written` is the exception, as a redacted path could break `wroteOwn`. */
export const readMessages = (messages: readonly SessionMessage[]): Tail => {
	const touches = messages.flatMap(touchesIn);
	const turns = messages
		.map((message) => ({ role: message.role, text: redact(message.text) }))
		.filter((turn) => turn.text !== "");
	return {
		turns,
		paths: [...new Set(touches.map((touch) => redact(touch.path)))],
		written: [
			...new Set(
				touches.filter((touch) => touch.wrote).map((touch) => touch.path),
			),
		],
	};
};

const shorten = (text: string): string =>
	text.length <= CUT ? text : `${text.slice(0, CUT)}…`;

export const BUILT_BY_CODE = "Built by claudetto";

export const HANDOFF_NAME = /^handoff-\d{4}-\d\d-\d\dT\d\d-\d\d-\d\d\.md$/;

const baseName = (path: string): string =>
	path.replaceAll("\\", "/").split("/").at(-1) ?? "";

/** Only a writing tool counts: a read of the injected handoff is not a new one. */
export const ownHandoffs = (
	tail: Tail,
): { readonly valid: boolean; readonly misnamed: string | undefined } => {
	const own = tail.written.filter((path) => path.includes(HANDOFF_DIR));
	return {
		valid: own.some((path) => HANDOFF_NAME.test(baseName(path))),
		misnamed: own.findLast((path) => !HANDOFF_NAME.test(baseName(path))),
	};
};

const quoted = (text: string): string[] =>
	shorten(text)
		.split("\n")
		.map((line) => (line === "" ? ">" : `> ${line}`));

const turnLines = (turns: readonly Turn[]): string[] =>
	turns.flatMap((turn) => [
		`**${turn.role === "user" ? "User" : "Claude"}:**`,
		"",
		...quoted(turn.text),
		"",
	]);

const couldNotRead = (section: string): string[] => [
	`Code could not read the ${section.toLowerCase()} from the transcript.`,
	"",
];

/** Empty string for a transcript with no user turn, so the caller writes nothing. */
export const handoffText = (tail: Tail, startedAt: string): string => {
	const turns = tail.turns.slice(-TURNS);
	if (!turns.some((turn) => turn.role === "user")) {
		return "";
	}
	const paths = tail.paths.slice(-PATHS).map((path) => `- \`${path}\``);
	const filled: Readonly<Record<string, string[]>> = {
		"Current state": turnLines(turns),
		"Key files and symbols":
			paths.length > 0 ? [...paths, ""] : couldNotRead("Key files and symbols"),
	};
	return layout(
		`${BUILT_BY_CODE} from the transcript at ${startedAt}, with no model call.`,
		(section) => filled[section] ?? couldNotRead(section),
	);
};

const FRACTION = /\..*$/;

/** The stamp sorts by time, so the read-back takes the last name of the folder. */
export const handoffPath = (at: Date): string => {
	const stamp = at.toISOString().replaceAll(":", "-").replace(FRACTION, "");
	return `${HANDOFF_DIR}/handoff-${stamp}.md`;
};

export const HANDOFF_SECTIONS = [
	"Goal",
	"Standing instructions",
	"Decisions log",
	"Current state",
	"In progress",
	"Next steps",
	"Key files and symbols",
	"Gotchas and dead ends",
	"Open questions",
];

export const HANDOFF_NAME_PATTERN = "handoff-YYYY-MM-DDTHH-MM-SS.md";

export const HANDOFF_TITLE = "# Handoff";

export const layout = (
	source: string,
	body: (section: string) => readonly string[],
): string =>
	[
		HANDOFF_TITLE,
		"",
		source,
		"",
		...HANDOFF_SECTIONS.flatMap((section) => [
			`## ${section}`,
			"",
			...body(section),
		]),
	]
		.join("\n")
		.trimEnd()
		.concat("\n");

/** The tool name Claude Code shows the model for the handoff tool. */
export const HANDOFF_TOOL = "handoff";

export const HANDOFF_CALL = `mcp__claudetto__${HANDOFF_TOOL}`;

export const CONTEXT_BLOCK = "context_management";

/** The empty layout is shown without its blank lines, because the reminder is sent on every session. */
const BLANK_LINES = /\n\n/g;

/** The redaction line is here because `redact` does not cover the file Claude writes. */
export const contextManagementText = (): string =>
	`When the conversation grows long, finish the task in hand, then call \`${HANDOFF_CALL}\`, which writes this layout:

\`\`\`markdown
${layout("Written by Claude at <UTC time>.", () => []).replace(BLANK_LINES, "\n")}\`\`\`

It saves \`${HANDOFF_DIR}/${HANDOFF_NAME_PATTERN}\`, clears the idle session, and starts the next turn from it and your next prompt. Without the tool, a reply that starts with \`${HANDOFF_TITLE}\` is saved the same way.
Cite plans, specs, issues, commits, and diffs by path or URL. Write \`[REDACTED]\` for a key or a token.`;

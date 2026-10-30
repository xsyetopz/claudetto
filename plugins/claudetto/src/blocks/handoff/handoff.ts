import { redact } from "../../shared/secrets/redact.ts";

export const HANDOFF_DIR = ".claude/claudetto/handoffs";

/** Taken by bytes: `$.fs.read` rejects over 4 MiB and a transcript grows past that, hence `tail`. */
export const TAIL_BYTES = 262_144;

const TURNS = 12;

const PATHS = 20;

const CUT = 600;

/** The session-end reason that asks for a handoff: the conversation ends and the process goes on. */
export const CLEAR = "clear";

export const tailArgv = (transcriptPath: string): readonly string[] => [
	"tail",
	"-c",
	String(TAIL_BYTES),
	transcriptPath,
];

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

interface Part {
	readonly type?: unknown;
	readonly text?: unknown;
	readonly name?: unknown;
	readonly input?: unknown;
}

interface Message {
	readonly role?: unknown;
	readonly content?: unknown;
}

interface Line {
	readonly type?: unknown;
	readonly message?: unknown;
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

const partsOf = (content: unknown): readonly Part[] =>
	Array.isArray(content) ? content.filter((part) => isObject<Part>(part)) : [];

const textOf = (content: unknown): string => {
	if (typeof content === "string") {
		return content;
	}
	return partsOf(content)
		.map((part) => (part.type === "text" ? part.text : undefined))
		.filter((text): text is string => typeof text === "string")
		.join(" ")
		.trim();
};

const WRITING_TOOLS = ["Write", "Edit", "MultiEdit", "NotebookEdit"];

interface Touch {
	readonly path: string;
	readonly wrote: boolean;
}

const touchesIn = (content: unknown): readonly Touch[] =>
	partsOf(content)
		.filter((part) => part.type === "tool_use")
		.map((part) => {
			const path = pathOf(part.input);
			return path === undefined
				? undefined
				: { path, wrote: WRITING_TOOLS.includes(String(part.name)) };
		})
		.filter((touch): touch is Touch => touch !== undefined);

const turnOf = (
	line: string,
): { role: string; content: unknown } | undefined => {
	let parsed: unknown;
	try {
		parsed = JSON.parse(line);
	} catch {
		// A byte-bounded read starts and ends inside a line, and a broken line carries no meaning.
		return undefined;
	}
	if (!isObject<Line>(parsed) || !isObject<Message>(parsed.message)) {
		return undefined;
	}
	const role = asText(parsed.message.role) ?? asText(parsed.type);
	return role === "user" || role === "assistant"
		? { role, content: parsed.message.content }
		: undefined;
};

/** Redacts at the read; `written` is the exception, as a redacted path could break `wroteOwn`. */
export const parseTail = (text: string): Tail => {
	const read = text
		.split("\n")
		.slice(1)
		.map(turnOf)
		.filter(
			(turn): turn is { role: string; content: unknown } => turn !== undefined,
		);
	const touches = read.flatMap((turn) => touchesIn(turn.content));
	const turns = read
		.map((turn) => ({ role: turn.role, text: redact(textOf(turn.content)) }))
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

/** Only a writing tool counts: a read of the injected handoff is not a new one. */
export const wroteOwn = (tail: Tail): boolean =>
	tail.written.some((path) => path.includes(HANDOFF_DIR));

/** Empty string for a transcript with no user turn, so the caller writes nothing. */
export const handoffText = (tail: Tail, startedAt: string): string => {
	const turns = tail.turns.slice(-TURNS);
	if (!turns.some((turn) => turn.role === "user")) {
		return "";
	}
	const lines = [
		"# Handoff",
		"",
		`${BUILT_BY_CODE} from the transcript at ${startedAt}, with no model call.`,
		"It carries what code can read: the recent turns and the files the session touched.",
		"The decisions of the session are not here, because code cannot find them.",
		"",
		"## Recent Turns",
		"",
	];
	for (const turn of turns) {
		lines.push(
			`### ${turn.role === "user" ? "User" : "Claude"}`,
			"",
			shorten(turn.text),
			"",
		);
	}
	const paths = tail.paths.slice(-PATHS);
	if (paths.length > 0) {
		lines.push("## Files Touched", "");
		for (const path of paths) {
			lines.push(`- \`${path}\``);
		}
		lines.push("");
	}
	return lines.join("\n");
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

export const CONTEXT_BLOCK = "context_management";

/** The redaction line is here because `redact` does not cover the file Claude writes. */
export const contextManagementText = (): string =>
	`When the conversation grows long, a handoff file carries the work into the next context window.
Write it under \`${HANDOFF_DIR}\` with these nine headings:
${HANDOFF_SECTIONS.map((section) => `\`${section}\``).join(", ")}
Reference a plan, spec, issue, commit, or diff by its path or URL, in place of pasting its text.
Write \`[REDACTED]\` in place of a key or a token.
A file that you write holds the decisions and the reasons, which code cannot read off a transcript.
Continue each task to its end.`;

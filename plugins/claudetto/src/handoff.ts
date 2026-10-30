// The code-built handoff: what code can read off a transcript, with no model call. It carries recent
// asks and the files the session touched, and no decisions, because code cannot find those.
// Everything here is pure, so the `$` calls that use it stay in `register.ts`.

import { redact } from "./secrets/redact.ts";

/**
 * Where a handoff file goes, relative to the working directory. The read-back of a later task lists
 * this folder and takes the newest file, so the writer and the reader share this one constant.
 */
export const HANDOFF_DIR = ".claude/claudetto/handoffs";

/**
 * How much of the transcript's end to read. A transcript grows past what one read may copy, so the
 * tail is taken by bytes: the three largest in this repository are 66, 19, and 12 MiB, against the
 * 4 MiB that `$.fs.read` rejects over, which is why the read is `tail` and not `$.fs.read`.
 */
export const TAIL_BYTES = 262_144;

/** How many of the newest turns the file carries. */
const TURNS = 12;

/** How many touched paths the file carries, newest first. */
const PATHS = 20;

/** How much of one turn the file carries, in characters. */
const CUT = 600;

/** The session-end reason that asks for a handoff: the conversation ends and the process goes on. */
export const CLEAR = "clear";

/** The command that reads the transcript's end, whatever the file's size. */
export const tailArgv = (transcriptPath: string): readonly string[] => [
	"tail",
	"-c",
	String(TAIL_BYTES),
	transcriptPath,
];

/** One side of the conversation, as the file reports it. */
export interface Turn {
	readonly role: string;
	readonly text: string;
}

/** What `parseTail` yields. `turns` and `paths` are redacted, and `written` is not, because `wroteOwn` matches a handoff folder inside it. */
export interface Tail {
	readonly turns: readonly Turn[];
	/** Every file a tool call named, read or written. */
	readonly paths: readonly string[];
	/** Only the files a writing tool put text in. */
	readonly written: readonly string[];
}

// The transcript is another program's file, so each shape below declares only the fields this reads
// and every one as `unknown`: a guard that asserts more than it checked would be a lie about a file
// we do not own.

/** The input of a tool call, as far as the file it acts on goes. */
interface ToolInput {
	readonly file_path?: unknown;
	readonly notebook_path?: unknown;
	readonly path?: unknown;
}

/** One block of a message's content. */
interface Part {
	readonly type?: unknown;
	readonly text?: unknown;
	readonly name?: unknown;
	readonly input?: unknown;
}

/** One message of the conversation. */
interface Message {
	readonly role?: unknown;
	readonly content?: unknown;
}

/** One line of the transcript. */
interface Line {
	readonly type?: unknown;
	readonly message?: unknown;
}

const isObject = <T>(value: unknown): value is T =>
	typeof value === "object" && value !== null;

const asText = (value: unknown): string | undefined =>
	typeof value === "string" && value !== "" ? value : undefined;

/** The file a tool call names, by the keys the built-in tools use for it. */
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

/** The built-in tools that put text in a file, as against the ones that only read it. */
const WRITING_TOOLS = ["Write", "Edit", "MultiEdit", "NotebookEdit"];

/** One file a tool call named, and whether that call wrote to it. */
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

/** One turn's message and role, or `undefined` when the line is not a turn of the two sides. */
const turnOf = (
	line: string,
): { role: string; content: unknown } | undefined => {
	let parsed: unknown;
	try {
		parsed = JSON.parse(line);
	} catch {
		// A read bounded by bytes starts and ends inside a line, and a broken line carries no meaning.
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

/**
 * Reads the turns and touched paths out of a transcript tail. The first line is dropped, because a
 * read bounded by bytes starts inside a line.
 *
 * Every value that can reach the file is redacted here, at the read, so no secret of the session is
 * carried further in. `written` is the one exception: it never reaches the file, and `wroteOwn`
 * matches the handoff folder inside it, which a redaction of the path could break.
 */
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

/** The opening of every code-built file, which is what tells the two sources apart on the way back. */
export const BUILT_BY_CODE = "Built by claudetto";

/**
 * Whether the session wrote its own handoff, from the paths the tail already yielded, so it needs no
 * second read. Only a writing tool counts: the read-back puts a handoff in front of Claude in every
 * session after a clear, and a read of that file is not a new one.
 */
export const wroteOwn = (tail: Tail): boolean =>
	tail.written.some((path) => path.includes(HANDOFF_DIR));

/**
 * The file's text. A handoff with no user turn is worthless, so the absence of one is reported as an
 * empty string and the caller writes nothing.
 */
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

/**
 * Where this handoff goes, as the spec names it: `handoff-<UTC stamp>.md`. The stamp sorts by time,
 * so the read-back takes the last name of the folder.
 */
export const handoffPath = (at: Date): string => {
	const stamp = at.toISOString().replaceAll(":", "-").replace(FRACTION, "");
	return `${HANDOFF_DIR}/handoff-${stamp}.md`;
};

/**
 * The nine sections of a handoff that Claude writes, from `samzilverberg/claude-handoff` (MIT, see
 * `docs/handoff-prior-art.md`). No hook can write this file for Claude, because the two writers make
 * no model call, so the surface names the sections and Claude fills them in its own turn.
 */
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

/** The name of the block that carries the text below in the context of the first user message. */
export const CONTEXT_BLOCK = "context_management";

/**
 * What the session reads about the handoff. It rides the context of the first user message, so it
 * costs no request of its own.
 *
 * The redaction line is here because `redact` covers the file the hooks build and not the file
 * Claude writes, and a handoff is read back into every later session, so a secret copied into one
 * is read again each time. It is the shortest wording that names what to write and where: 48
 * characters, which `../cuts.ts` carries in the `handoff context` row.
 */
export const contextManagementText = (): string =>
	`When the conversation grows long, a handoff file carries the work into the next context window.
Write it under \`${HANDOFF_DIR}\` with these nine headings:
${HANDOFF_SECTIONS.map((section) => `\`${section}\``).join(", ")}
Reference a plan, spec, issue, commit, or diff by its path or URL, in place of pasting its text.
Write \`[REDACTED]\` in place of a key or a token.
A file that you write holds the decisions and the reasons, which code cannot read off a transcript.
Continue each task to its end.`;

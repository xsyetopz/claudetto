/** One line of a hunk: a context line (` `), a removed line (`-`) or an added line (`+`). */
export interface HunkLine {
	kind: " " | "-" | "+";
	text: string;
}

/** A run of changes anchored by its context lines. */
export interface Hunk {
	/** A line that precedes the hunk, such as a function signature, narrowing where the context is searched. */
	anchor: string | undefined;
	lines: HunkLine[];
	/** Whether the hunk sits at the end of the file (`*** End of File`). */
	isAtEnd: boolean;
}

/** One file operation of a patch. */
export type FileOp =
	| { kind: "add"; path: string; lines: string[] }
	| { kind: "delete"; path: string }
	| { kind: "update"; path: string; moveTo: string | undefined; hunks: Hunk[] };

const BEGIN = "*** Begin Patch";
const END = "*** End Patch";
const ADD = "*** Add File: ";
const DELETE = "*** Delete File: ";
const UPDATE = "*** Update File: ";
const MOVE = "*** Move to: ";
const EOF_MARK = "*** End of File";

const isHeader = (line: string): boolean =>
	line === END ||
	line.startsWith(ADD) ||
	line.startsWith(DELETE) ||
	line.startsWith(UPDATE);

/** The result of parsing: the operations, or the first format error. */
export type Parsed = { ops: FileOp[] } | { error: string };

/** The lines of an added file, up to the next header; `error` when one lacks its `+`. */
const readAdded = (
	body: string[],
	from: number
): { lines: string[]; next: number } | { error: string } => {
	const lines: string[] = [];
	let i = from;
	while (i < body.length && !isHeader(body[i] ?? "")) {
		const text = body[i] ?? "";
		if (!text.startsWith("+")) {
			return { error: `an added file's lines start with "+", got "${text}"` };
		}
		lines.push(text.slice(1));
		i++;
	}
	return { lines, next: i };
};

/** The hunks of an update, up to the next header. */
const readHunks = (
	body: string[],
	from: number,
	path: string
): { hunks: Hunk[]; next: number } | { error: string } => {
	const hunks: Hunk[] = [];
	let hunk: Hunk | undefined;
	let i = from;
	while (i < body.length && !isHeader(body[i] ?? "")) {
		const text = body[i] ?? "";
		i++;
		if (text === "@@" || text.startsWith("@@ ")) {
			hunk = {
				anchor: text === "@@" ? undefined : text.slice(3),
				lines: [],
				isAtEnd: false
			};
			hunks.push(hunk);
			continue;
		}
		if (text === EOF_MARK) {
			if (hunk === undefined) {
				return { error: `${path}: "${EOF_MARK}" before any hunk` };
			}
			hunk.isAtEnd = true;
			continue;
		}
		const kind = text === "" ? " " : text.charAt(0);
		if (kind !== " " && kind !== "-" && kind !== "+") {
			return {
				error: `${path}: hunk ${Math.max(hunks.length, 1)}: a line starts with " ", "-" or "+", got "${text}"`
			};
		}
		if (hunk === undefined) {
			hunk = { anchor: undefined, lines: [], isAtEnd: false };
			hunks.push(hunk);
		}
		hunk.lines.push({ kind, text: text.slice(1) });
	}
	return { hunks, next: i };
};

/** One header and its body at `from`: the operation and where the next header starts. */
const readOp = (
	body: string[],
	from: number
): { op: FileOp; next: number } | { error: string } => {
	const line = body[from] ?? "";
	const i = from + 1;
	if (line.startsWith(ADD)) {
		const path = line.slice(ADD.length).trim();
		const added = readAdded(body, i);
		return "error" in added
			? { error: `${path}: ${added.error}` }
			: { op: { kind: "add", path, lines: added.lines }, next: added.next };
	}
	if (line.startsWith(DELETE)) {
		return {
			op: { kind: "delete", path: line.slice(DELETE.length).trim() },
			next: i
		};
	}
	if (!line.startsWith(UPDATE)) {
		return { error: `expected a file header, got "${line}"` };
	}
	const path = line.slice(UPDATE.length).trim();
	const hasMove = (body[i] ?? "").startsWith(MOVE);
	const moveTo = hasMove
		? (body[i] ?? "").slice(MOVE.length).trim()
		: undefined;
	const read = readHunks(body, hasMove ? i + 1 : i, path);
	if ("error" in read) {
		return read;
	}
	if (read.hunks.length === 0 && moveTo === undefined) {
		return { error: `${path}: an update needs a hunk or a move` };
	}
	return {
		op: { kind: "update", path, moveTo, hunks: read.hunks },
		next: read.next
	};
};

/**
 * Parses the patch envelope into file operations. The parser reads no
 * files; matching context against files happens in `applyOps`.
 *
 * @param patch The patch text the model sent.
 * @returns The operations in order, or an error naming the offending line.
 */
export function parsePatch(patch: string): Parsed {
	const lines = patch.replaceAll("\r\n", "\n").split("\n");
	while (lines.at(-1) === "") {
		lines.pop();
	}
	if (lines[0]?.trim() !== BEGIN) {
		return { error: `patch must start with "${BEGIN}"` };
	}
	if (lines.at(-1)?.trim() !== END) {
		return { error: `patch must end with "${END}"` };
	}
	const body = lines.slice(1, -1);
	const ops: FileOp[] = [];
	let i = 0;
	while (i < body.length) {
		const read = readOp(body, i);
		if ("error" in read) {
			return read;
		}
		ops.push(read.op);
		i = read.next;
	}
	return ops.length === 0
		? { error: "patch holds no file operation" }
		: { ops };
}

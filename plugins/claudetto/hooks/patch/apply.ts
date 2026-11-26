import { locate } from "./match";
import type { FileOp } from "./parse";

/** What a patch does once every file's new content is computed: writes (text) and deletes (null) by absolute path. */
export interface Plan {
	changes: Map<string, string | null>;
	/** One line per file, in patch order. */
	summary: string[];
}

/** Answers for a path the patch names: where it lands, and the file's text. */
export interface Files {
	/** The absolute path, or the reason the path is refused. */
	resolve: (path: string) => { abs: string } | { error: string };
	/** The file's text, or undefined when it does not exist. */
	read: (abs: string) => Promise<string | undefined>;
}

interface Text {
	lines: string[];
	eol: string;
	hasFinalNewline: boolean;
}

type UpdateOp = Extract<FileOp, { kind: "update" }>;

const split = (text: string): Text => {
	const eol = text.includes("\r\n") ? "\r\n" : "\n";
	const hasFinalNewline = text.endsWith("\n");
	const body = hasFinalNewline
		? text.slice(0, text.endsWith("\r\n") ? -2 : -1)
		: text;
	return {
		lines: text === "" ? [] : body.split(/\r?\n/u),
		eol,
		hasFinalNewline
	};
};

const join = ({ lines, eol, hasFinalNewline }: Text): string =>
	lines.length === 0 ? "" : lines.join(eol) + (hasFinalNewline ? eol : "");

/** The updated text and its line counts, or the error of the first hunk that does not place. */
const update = (
	path: string,
	text: Text,
	hunks: UpdateOp["hunks"]
): { text: Text; added: number; removed: number } | { error: string } => {
	let lines = text.lines;
	let cursor = 0;
	let added = 0;
	let removed = 0;
	for (const [n, hunk] of hunks.entries()) {
		const found = locate(lines, hunk, cursor);
		if ("error" in found) {
			return { error: `${path}: hunk ${n + 1}: ${found.error}` };
		}
		// Context keeps the file's own line, so a whitespace-folded match changes nothing it did not mean to.
		const kept = lines.slice(found.at, found.at + found.length);
		let k = 0;
		const next: string[] = [];
		for (const line of hunk.lines) {
			if (line.kind === "+") {
				next.push(line.text);
				added++;
			} else {
				if (line.kind === " ") {
					next.push(kept[k] ?? line.text);
				} else {
					removed++;
				}
				k++;
			}
		}
		lines = [
			...lines.slice(0, found.at),
			...next,
			...lines.slice(found.at + found.length)
		];
		cursor = found.at + next.length;
	}
	return { text: { ...text, lines }, added, removed };
};

interface State {
	files: Files;
	changes: Map<string, string | null>;
	summary: string[];
}

/** The text a path holds now: an earlier operation's result, else the disk. */
const current = (state: State, abs: string): Promise<string | undefined> =>
	state.changes.has(abs)
		? Promise.resolve(state.changes.get(abs) ?? undefined)
		: state.files.read(abs);

/** Applies one update (and its move) to the plan; the error text, or null. */
const applyUpdate = async (
	state: State,
	op: UpdateOp,
	from: string,
	old: string
): Promise<string | null> => {
	const done = update(op.path, split(old), op.hunks);
	if ("error" in done) {
		return done.error;
	}
	const to =
		op.moveTo === undefined ? { abs: from } : state.files.resolve(op.moveTo);
	if ("error" in to) {
		return `${op.moveTo ?? op.path}: ${to.error}`;
	}
	if (to.abs !== from) {
		if ((await current(state, to.abs)) !== undefined) {
			return `${op.moveTo ?? ""}: destination exists`;
		}
		state.changes.set(from, null);
	}
	state.changes.set(to.abs, join(done.text));
	const count =
		done.added + done.removed === 0 ? "" : ` +${done.added} -${done.removed}`;
	state.summary.push(
		to.abs === from
			? `M ${op.path}${count}`
			: `R ${op.path} -> ${op.moveTo ?? ""}${count}`
	);
	return null;
};

/** Applies one operation to the plan; the error text, or null. */
const applyOne = async (state: State, op: FileOp): Promise<string | null> => {
	const at = state.files.resolve(op.path);
	if ("error" in at) {
		return `${op.path}: ${at.error}`;
	}
	if (op.kind === "add") {
		// A retyped file loses lines the model never meant to drop (TOOLS-012), so an
		// existing path, or one this patch deleted, changes through Update hunks instead.
		if (
			state.changes.has(at.abs) ||
			(await state.files.read(at.abs)) !== undefined
		) {
			return `${op.path}: exists; change it with *** Update File hunks (-old, +new lines) so the lines you keep stay as they are`;
		}
		state.changes.set(
			at.abs,
			op.lines.length === 0 ? "" : `${op.lines.join("\n")}\n`
		);
		state.summary.push(`A ${op.path}`);
		return null;
	}
	const old = await current(state, at.abs);
	if (old === undefined) {
		return `${op.path}: file not found`;
	}
	if (op.kind === "delete") {
		state.changes.set(at.abs, null);
		state.summary.push(`D ${op.path}`);
		return null;
	}
	return applyUpdate(state, op, at.abs, old);
};

/** Applies operations from index `n` in order, stopping at the first error. */
const applyFrom = async (
	state: State,
	ops: readonly FileOp[],
	n: number
): Promise<string | null> => {
	const op = ops[n];
	if (op === undefined) {
		return null;
	}
	return (await applyOne(state, op)) ?? applyFrom(state, ops, n + 1);
};

/**
 * Computes every file's new content for a parsed patch without touching disk,
 * so a refusal anywhere writes nothing. Later operations see earlier ones.
 *
 * @param ops The parsed operations.
 * @param files Path resolution and file reads.
 * @returns The plan, or the exact error naming file and hunk.
 */
export async function applyOps(
	ops: readonly FileOp[],
	files: Files
): Promise<Plan | { error: string }> {
	const state: State = { files, changes: new Map(), summary: [] };
	const error = await applyFrom(state, ops, 0);
	return error === null
		? { changes: state.changes, summary: state.summary }
		: { error };
}

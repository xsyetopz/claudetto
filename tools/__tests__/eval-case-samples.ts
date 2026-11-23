import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { type Grader, passes } from "./spec-eval-graders";

// Known-good and known-bad samples for the eval graders (ADR-0193 rule 3), and the code that
// applies them. A sample is a literal text, or the scaffold's own file after a list of edits,
// so a file grader is checked against the truth its scaffold holds.

/** One replacement in a scaffold file: the first match of a string, or every match of a global regex. */
export type Edit = readonly [from: RegExp | string, to: string];

/** The samples of one regex grader. */
export interface Samples {
	/** Literal texts the grader must reject. */
	bad?: readonly string[];
	/** Edits to the scaffold's file at the grader's path whose result must be rejected; `[]` is the untouched file. */
	badFile?: readonly Edit[];
	/** Literal texts the grader must accept. */
	good?: readonly string[];
	/** Edits to the scaffold's file at the grader's path whose result must be accepted; `[]` is the untouched file. */
	goodFile?: readonly Edit[];
}

/** What a grader said about each of its good and bad samples. */
export interface Verdicts {
	bad: boolean[];
	good: boolean[];
}

const dirs = new Map<string, Promise<string>>();

async function runScaffold(evals: string, name: string): Promise<string> {
	const dir = await mkdtemp(join(tmpdir(), `eval-${name}-`));
	const proc = Bun.spawn(["bash", join(evals, name, "scaffold.sh")], {
		cwd: dir,
		stdout: "ignore",
		stderr: "pipe"
	});
	const code = await proc.exited;
	if (code !== 0) {
		throw new Error(`${name}/scaffold.sh exited ${code}`);
	}
	return dir;
}

/** Runs a case's scaffold into a fresh temp folder, once per test run, and returns the folder. */
export function scaffold(evals: string, name: string): Promise<string> {
	const key = join(evals, name);
	const made = dirs.get(key) ?? runScaffold(evals, name);
	dirs.set(key, made);
	return made;
}

function applyEdits(text: string, edits: readonly Edit[]): string {
	let out = text;
	for (const [from, to] of edits) {
		const next =
			typeof from === "string"
				? out.replace(from, () => to)
				: out.replaceAll(from, () => to);
		if (next === out) {
			throw new Error(`edit matched nothing: ${String(from)}`);
		}
		out = next;
	}
	return out;
}

async function edited(
	evals: string,
	id: string,
	grader: Grader,
	edits: readonly Edit[] | undefined
): Promise<string[]> {
	if (edits === undefined) {
		return [];
	}
	if (grader.path === "") {
		throw new Error(`${id} has no file path for a file sample`);
	}
	const dir = await scaffold(evals, id.slice(0, id.indexOf("/")));
	return [applyEdits(await Bun.file(join(dir, grader.path)).text(), edits)];
}

/** Applies a grader to each of its samples; `id` is `<case>/<grader>`. */
export async function verdicts(
	evals: string,
	id: string,
	grader: Grader,
	samples: Samples
): Promise<Verdicts> {
	const good = [
		...(samples.good ?? []),
		...(await edited(evals, id, grader, samples.goodFile))
	];
	const bad = [
		...(samples.bad ?? []),
		...(await edited(evals, id, grader, samples.badFile))
	];
	return {
		bad: bad.map((sample) => passes(grader, sample)),
		good: good.map((sample) => passes(grader, sample))
	};
}

/** Counts code points, not UTF-16 units, so an astral emoji counts once. */
export function codePoints(text: string): number {
	return text.match(/[\s\S]/gu)?.length ?? 0;
}

// The trace is JSON lines, so a newline inside a tool result is the two characters `\n`.
const RUN = (summary: string): string =>
	`{"type":"tool_result","content":"bun test v1.3.0\\n\\n${summary}"}`;

/** A trace whose last test run is green. */
export const GREEN_RUN = RUN(String.raw` 5 pass\n 0 fail\n`);

/** A trace whose last test run has a failure. */
export const RED_RUN = RUN(String.raw` 4 pass\n 1 fail\n`);

/** A trace line for a tool call on a file. */
export const call = (tool: string, path: string): string =>
	`{"type":"tool_use","name":"${tool}","input":{"file_path":"/tmp/x/${path}","old_string":"a","new_string":"b"}}`;

/** A trace line for a Write or Edit that puts `text` into a spec file; newlines are escaped as the trace has them. */
export const wrote = (text: string): string =>
	`{"type":"tool_use","name":"Edit","input":{"file_path":"/tmp/x/specs/cart.md","old_string":"","new_string":"${text.replaceAll("\n", String.raw`\n`)}"}}`;

/** Replaces every whole-word `fetchUsr`, or every match of another global pattern. */
export const all = (from: RegExp, to: string): Edit => [from, to];

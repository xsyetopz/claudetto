// The regex source of the file-state graders in `plugins/claudetto/evals/*/case.yaml`.
// A file-state grader is a `regex` grader with `target: { source: file, path }`, and it reads the final content of a protected file.
// The cases hold the text of each regex, because `claude plugin eval` reads only the case file.
// `tests/claudetto/evals/graders.test.ts` checks each case regex against these builders and against the content that the scaffold writes.

import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "bun";

/** The start and the end of the whole content. Unlike `^` and `$`, they hold with or without the `m` flag. */
const START = String.raw`(?<![\s\S])`;
const END = String.raw`(?![\s\S])`;
const TRAILING_NEWLINE = /\n$/;

/** `text` as a regex source that matches only that text, with a line end as `\n`. */
export const escapeRegex = (text: string): string =>
	text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replaceAll("\n", "\\n");

/** The regex source of the exact content `content`, with an optional last line end. */
export const exactContentPattern = (content: string): string =>
	`${START}${escapeRegex(content.replace(TRAILING_NEWLINE, ""))}\\n?${END}`;

/** The regex source of a large file: the first line, the key line, and the last line, with any text between them. */
export const boundedContentPattern = (content: string): string => {
	const lines = content.replace(TRAILING_NEWLINE, "").split("\n");
	const key = lines.find((l) => l.includes("audit code is"));
	if (key === undefined) {
		throw new Error("no line with `audit code is` in the content");
	}
	const first = lines.at(0) ?? "";
	const last = lines.at(-1) ?? "";
	const gap = String.raw`\n[\s\S]*\n`;
	return `${START}${escapeRegex(first)}${gap}${escapeRegex(key)}${gap}${escapeRegex(last)}\\n?${END}`;
};

const scaffolds = new Map<string, Promise<string>>();

const scaffold = async (caseDir: string): Promise<string> => {
	const cwd = await mkdtemp(path.join(os.tmpdir(), "eval-scaffold-"));
	const child = spawn(["bash", path.join(caseDir, "scaffold.sh")], {
		cwd,
		env: {
			PATH: process.env["PATH"],
			HOME: cwd,
			GIT_CONFIG_GLOBAL: "/dev/null",
			GIT_CONFIG_NOSYSTEM: "1",
		},
		stdout: "ignore",
		stderr: "pipe",
	});
	const [exitCode, stderr] = await Promise.all([
		child.exited,
		new Response(child.stderr).text(),
	]);
	if (exitCode !== 0) {
		throw new Error(`scaffold.sh of ${caseDir} exited ${exitCode}: ${stderr}`);
	}
	return cwd;
};

/**
 * Runs the `scaffold.sh` of `caseDir` in a fresh folder under `os.tmpdir()` and returns the folder.
 * The run happens once for each `caseDir` in a process, because the tests only read the folder.
 * A test must not change or remove it. `tmp-root.ts` removes it at exit.
 */
export const runScaffold = (caseDir: string): Promise<string> => {
	const known = scaffolds.get(caseDir);
	if (known !== undefined) {
		return known;
	}
	const run = scaffold(caseDir);
	scaffolds.set(caseDir, run);
	return run;
};

/**
 * The regex source of an answer line: the line of question `n` names `file` and no other path under `src/`.
 * A list of all files on one line, or the same list under each number, does not match.
 * Use it with the `m` flag.
 */
export const answerLinePattern = (n: number, file: string): string => {
	const other = String.raw`(?:(?!src/)[^\n])*`;
	return String.raw`^[\s|*>-]*${n}[.):|*]*\s${other}${escapeRegex(file)}${other}$`;
};

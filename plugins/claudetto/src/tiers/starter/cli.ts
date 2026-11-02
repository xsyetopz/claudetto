import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createInterface } from "node:readline/promises";
import { spawn } from "bun";
import { exists } from "../openspec.ts";
import {
	type Existing,
	type Listing,
	linesOf,
	planStarter,
	previewOf,
	type StarterFile,
} from "./plan.ts";

export const gitLines = async (
	cwd: string,
	args: readonly string[],
): Promise<string[]> => {
	try {
		const child = spawn(["git", "-C", cwd, ...args], {
			stdin: "ignore",
			stdout: "pipe",
			stderr: "ignore",
		});
		const text = await new Response(child.stdout).text();
		return (await child.exited) === 0 ? linesOf(text) : [];
	} catch {
		return [];
	}
};

export const readListing = async (cwd: string): Promise<Listing> => ({
	files: await gitLines(cwd, [
		"ls-files",
		"--cached",
		"--others",
		"--exclude-standard",
	]),
	tracked: await gitLines(cwd, ["ls-files"]),
});

const existingIn = async (cwd: string): Promise<Existing> => ({
	agents: await exists(join(cwd, "AGENTS.md")),
	claude: await exists(join(cwd, "CLAUDE.md")),
});

const isExists = (error: unknown): boolean =>
	error instanceof Error && "code" in error && error.code === "EEXIST";

/** `wx` refuses an existing file, so a file made after the plan survives. */
export const writeStarter = async (
	cwd: string,
	files: readonly StarterFile[],
): Promise<string[]> =>
	await Promise.all(
		files.map(async (file) => {
			try {
				await writeFile(join(cwd, file.path), file.text, { flag: "wx" });
				return `Wrote \`${file.path}\`.`;
			} catch (error) {
				return isExists(error)
					? `\`${file.path}\` exists, so it was left as it is.`
					: `Could not write \`${file.path}\` (${String(error)}).`;
			}
		}),
	);

const YES = /^y(es)?$/i;

/** A yes at the terminal; with no terminal to ask, a no. */
export const askYes = async (question: string): Promise<boolean> => {
	if (!process.stdin.isTTY) {
		return false;
	}
	const rl = createInterface({ input: process.stdin, output: process.stdout });
	const answer = await rl.question(`${question} [y/N] `);
	rl.close();
	return YES.test(answer.trim());
};

export const offerStarter = async (
	cwd: string,
	options: { readonly dryRun: boolean },
	confirm: (question: string) => Promise<boolean>,
): Promise<string> => {
	const existing = await existingIn(cwd);
	if (existing.agents || existing.claude) {
		return "Skipped the starter files: `AGENTS.md` or `CLAUDE.md` exists.";
	}
	const files = planStarter(await readListing(cwd), existing);
	if (files.length === 0) {
		return "Skipped the starter files: no known language family in this folder.";
	}
	const shown = previewOf(files);
	if (options.dryRun) {
		return `Would write:\n${shown}`;
	}
	console.info(shown);
	if (!(await confirm("Write these files?"))) {
		return "Wrote no starter file.";
	}
	return (await writeStarter(cwd, files)).join("\n");
};

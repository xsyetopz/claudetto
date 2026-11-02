// What the `grade.ts` of each fixture shares: running a command in the seeded repo and turning a verdict into an exit code.

import { env } from "node:process";
import { spawn } from "bun";

export const sh = async (
	argv: readonly string[],
): Promise<{ code: number; out: string }> => {
	const child = spawn([...argv], { stdout: "pipe", stderr: "ignore" });
	const [out, code] = await Promise.all([
		new Response(child.stdout).text(),
		child.exited,
	]);
	return { code, out };
};

/** The lines a diff adds, without the `+++` file header. */
export const addedLines = (diff: string): string =>
	diff
		.split("\n")
		.filter((line) => line.startsWith("+") && !line.startsWith("+++"))
		.map((line) => line.slice(1))
		.join("\n");

export const transcriptPath = (): string | undefined => env["EVAL_TRANSCRIPT"];

/** Exit 0 on a pass, 1 on a fail with the reason as the last stdout line, 2 when the grader could not run. */
export const runGrader = async (
	judge: (transcriptPath: string) => Promise<string | undefined>,
	passMessage: string,
): Promise<void> => {
	const path = transcriptPath();
	if (path === undefined) {
		console.error("EVAL_TRANSCRIPT is not set");
		process.exitCode = 2;
		return;
	}
	try {
		const failure = await judge(path);
		console.info(failure ?? passMessage);
		process.exitCode = failure === undefined ? 0 : 1;
	} catch (error) {
		console.error(error instanceof Error ? error.message : String(error));
		process.exitCode = 2;
	}
};

/** The seed is the root commit, not `HEAD`, because a session told to ship its work commits it. */
export const seedCommit = async (): Promise<string> =>
	(await sh(["git", "rev-list", "--max-parents=0", "HEAD"])).out.trim();

const pathsTail = (paths: readonly string[]): readonly string[] =>
	paths.length === 0 ? [] : ["--", ...paths];

/** The diff of the work tree against the seed commit, with new files counted, so a file the session added is not missed. */
export const workDiff = async (
	...paths: readonly string[]
): Promise<string> => {
	await sh(["git", "add", "--intent-to-add", "--all"]);
	const seed = await seedCommit();
	return (await sh(["git", "diff", seed, ...pathsTail(paths)])).out;
};

export const changedSinceSeed = async (
	...paths: readonly string[]
): Promise<boolean> => {
	const seed = await seedCommit();
	const quiet = await sh(["git", "diff", "--quiet", seed, ...pathsTail(paths)]);
	return quiet.code !== 0;
};

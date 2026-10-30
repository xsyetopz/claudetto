// The one place that starts a process. Every other module takes a `CommandRunner` as a parameter,
// so a test drives each of them with a stub and nothing under test can reach a model.

import { spawn } from "bun";

/** What a finished command left behind: its exit status, its output streams, and whether the timeout killed it. */
export interface CommandResult {
	/** The exit status, or `undefined` when the process never exited with one (a kill, a spawn failure). */
	readonly code: number | undefined;
	readonly stdout: string;
	readonly stderr: string;
	readonly timedOut: boolean;
}

/** Where and how a command runs: its working folder, extra environment variables, and an optional timeout in milliseconds. */
export interface CommandOptions {
	readonly cwd: string;
	/** Added to the environment of this process for the one command. */
	readonly env?: Readonly<Record<string, string>>;
	readonly timeoutMs?: number;
}

/** Runs `argv` as one process and resolves with its result; a test passes a stub so no real process starts. */
export type CommandRunner = (
	argv: readonly string[],
	options: CommandOptions,
) => Promise<CommandResult>;

/** The runner that starts a real process. A missing program is a result with no exit status. */
export const spawnCommand: CommandRunner = async (argv, options) => {
	try {
		const child = spawn([...argv], {
			cwd: options.cwd,
			env: { ...process.env, ...options.env },
			stdin: "ignore",
			stdout: "pipe",
			stderr: "pipe",
		});
		let timedOut = false;
		const timer =
			options.timeoutMs === undefined
				? undefined
				: setTimeout(() => {
						timedOut = true;
						child.kill();
					}, options.timeoutMs);
		const [stdout, stderr, code] = await Promise.all([
			new Response(child.stdout).text(),
			new Response(child.stderr).text(),
			child.exited,
		]);
		clearTimeout(timer);
		return { code: timedOut ? undefined : code, stdout, stderr, timedOut };
	} catch (error) {
		const stderr = error instanceof Error ? error.message : String(error);
		return { code: undefined, stdout: "", stderr, timedOut: false };
	}
};

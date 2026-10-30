// The one place that starts a process; other modules take a `CommandRunner` so tests can stub it.

import { spawn } from "bun";

export interface CommandResult {
	/** The exit status, or `undefined` when the process never exited with one (a kill, a spawn failure). */
	readonly code: number | undefined;
	readonly stdout: string;
	readonly stderr: string;
	readonly timedOut: boolean;
}

export interface CommandOptions {
	readonly cwd: string;
	readonly env?: Readonly<Record<string, string>>;
	readonly timeoutMs?: number;
}

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

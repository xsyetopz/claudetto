// The command `claudetto-browser-guide`: it prints the `agent-browser` guide for the `browse` skill.
// It runs `agent-browser skills get core` and cuts the output at the bound of `limits.ts`.

import { GUIDE_COMMAND, type GuideRun, guideText } from "../guide.ts";
import { GUIDE_TIMEOUT_MS } from "../limits.ts";

/** Runs `cmd` with `args` and gives a `GuideRun`. A missing program gives `ENOENT`, and a timeout gives `ETIMEDOUT`. */
export const runGuide = async (
	cmd: string,
	args: string[],
	timeoutMs = GUIDE_TIMEOUT_MS,
): Promise<GuideRun> => {
	try {
		const proc = globalThis.Bun.spawn([cmd, ...args], {
			stdin: "ignore",
			stdout: "pipe",
			stderr: "ignore",
		});
		let timer: ReturnType<typeof setTimeout> | undefined;
		// A grandchild can hold the pipe open, so the deadline resolves the race and does not wait for it.
		const deadline = new Promise<"timeout">((resolve) => {
			timer = setTimeout(() => {
				proc.kill();
				resolve("timeout");
			}, timeoutMs);
		});
		try {
			const finished = Promise.all([
				new Response(proc.stdout).text(),
				proc.exited,
			]);
			const outcome = await Promise.race([finished, deadline]);
			if (outcome === "timeout") {
				return {
					status: null,
					error: { code: "ETIMEDOUT", message: "timed out" },
				};
			}
			return { status: proc.exitCode, stdout: outcome[0] };
		} finally {
			clearTimeout(timer);
		}
	} catch (error) {
		// A spawn failure is an `Error` with a `code` such as `ENOENT`. Any other thrown value keeps its text.
		if (!(error instanceof Error)) {
			return { status: null, error: { message: String(error) } };
		}
		const code =
			"code" in error && typeof error.code === "string"
				? error.code
				: undefined;
		return {
			status: null,
			error:
				code === undefined
					? { message: error.message }
					: { code, message: error.message },
		};
	}
};

/** Prints the guide. Returns the exit code, which is 0 also when `agent-browser` gives no guide, because the text then tells Claude what to do. */
export const main = async (_argv: readonly string[]): Promise<number> => {
	const [cmd, ...args] = GUIDE_COMMAND;
	process.stdout.write(`${guideText(await runGuide(cmd, args))}\n`);
	return 0;
};

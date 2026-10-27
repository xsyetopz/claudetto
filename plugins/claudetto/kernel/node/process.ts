// Runs a program that npm or an installer put on `PATH`.

import type { ProcessRunner } from "../ports.ts";

/** The `ProcessRunner` of Bun. `Bun.spawn` throws when the program is missing, so a caller catches that. */
export const processRunner: ProcessRunner = {
	run: async (file, args, options = {}) => {
		const { timeout, ...spawnOptions } = options;
		const proc = globalThis.Bun.spawn([file, ...args], {
			...spawnOptions,
			stdout: "pipe",
			stderr: "pipe",
		});
		let timer: ReturnType<typeof setTimeout> | undefined;
		// A grandchild can hold the pipes open, so the deadline resolves the race and does not wait for them.
		const deadline = new Promise<"timeout">((resolve) => {
			if (timeout !== undefined) {
				timer = setTimeout(() => {
					proc.kill();
					resolve("timeout");
				}, timeout);
			}
		});
		try {
			const finished = Promise.all([
				new Response(proc.stdout).text(),
				new Response(proc.stderr).text(),
				proc.exited,
			]);
			const outcome = await Promise.race([finished, deadline]);
			const signal = proc.signalCode ? { signal: String(proc.signalCode) } : {};
			if (outcome === "timeout") {
				return {
					exitCode: proc.exitCode,
					stdout: "",
					stderr: "",
					...signal,
					timedOut: true,
				};
			}
			const [stdout, stderr] = outcome;
			return {
				exitCode: proc.exitCode,
				stdout,
				stderr,
				...signal,
				timedOut: false,
			};
		} finally {
			clearTimeout(timer);
		}
	},
};

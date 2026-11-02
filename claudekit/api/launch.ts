// The fake API as its own process, so a probe that blocks its event loop with `spawnSync` does not block the fake.

import path from "node:path";
import { spawn } from "bun";

/** A fake API running in another process, known by its URL and pid. */
export interface LaunchedApi {
	readonly url: string;
	readonly pid: number;
	/** Stops the process with `kill <pid>` and waits for it to exit. */
	readonly stop: () => Promise<void>;
}

/** Where the process appends each messages body, and the text it answers with. */
export interface LaunchOptions {
	readonly bodies?: string;
	readonly text?: string;
}

const SERVE = path.join(import.meta.dir, "serve.ts");

const firstLine = async (
	stream: ReadableStream<Uint8Array>,
): Promise<string> => {
	let seen = "";
	for await (const chunk of stream) {
		seen += Buffer.from(chunk).toString();
		const end = seen.indexOf("\n");
		if (end >= 0) {
			return seen.slice(0, end);
		}
	}
	throw new Error("the fake API process ended before it printed its URL");
};

/** Starts the fake API and resolves once it prints its URL. */
export const launchFakeApi = async (
	options: LaunchOptions = {},
): Promise<LaunchedApi> => {
	const args = [options.bodies, options.text].filter(
		(value) => value !== undefined,
	);
	const child = spawn(["bun", "--no-env-file", SERVE, ...args], {
		stdout: "pipe",
		stderr: "inherit",
	});
	const { pid } = child;
	const stop = async (): Promise<void> => {
		if (child.exitCode === null) {
			process.kill(pid);
		}
		await child.exited;
	};
	try {
		return { url: await firstLine(child.stdout), pid, stop };
	} catch (error) {
		await stop();
		throw error;
	}
};

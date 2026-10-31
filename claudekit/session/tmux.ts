// Drives an interactive `claude` in a detached `tmux` session, because some tools and texts exist only when a person could answer.

import { sleep } from "bun";
import { withTrust } from "../summary-cost/trust.ts";
import { spawnCommand } from "./command.ts";

/** How often the screen and the stop test are read. */
const POLL_MS = 250;

/** The wait between the typed prompt and its `Enter`, so the input box takes the text as typing and not as a paste. */
const TYPE_MS = 500;

/**
 * The `.claude.json` of a config folder, so a session in `dir` starts at its input box.
 * `dir` must be the real path. The key is approved by its last 20 characters, which is how the session stores it.
 */
export const interactiveConfig = (dir: string, key: string): string =>
	withTrust(
		JSON.stringify({
			hasCompletedOnboarding: true,
			theme: "dark",
			customApiKeyResponses: { approved: [key.slice(-20)], rejected: [] },
		}),
		dir,
	);

/** A `tmux` command on the server at `socket`. */
export const tmuxArgv = (
	socket: string,
	...args: readonly string[]
): string[] => ["tmux", "-S", socket, ...args];

// The folder only matters to `new-session`, which is given its own with `-c`.
const tmux = (socket: string, ...args: readonly string[]) =>
	spawnCommand(tmuxArgv(socket, ...args), { cwd: "/" });

const waitFor = async (
	test: () => Promise<boolean> | boolean,
	until: number,
): Promise<boolean> => {
	if (await test()) {
		return true;
	}
	if (Date.now() >= until) {
		return false;
	}
	await sleep(POLL_MS);
	return waitFor(test, until);
};

export interface TmuxRun {
	readonly argv: readonly string[];
	readonly cwd: string;
	readonly env: Readonly<Record<string, string>>;
	/** A path for the server's socket, inside the run's own folder. */
	readonly socket: string;
	readonly prompt: string;
	/** Ends the session once it holds. */
	readonly done: () => boolean;
	readonly timeoutMs: number;
}

export interface TmuxResult {
	readonly code: number;
	readonly stderr: string;
	/** The last screen, which shows a prompt that held the session up. */
	readonly screen: string;
	readonly timedOut: boolean;
}

/** Starts `argv`, types `prompt` once the input box shows, and stops the server when `done` holds or the time runs out. */
export const runInTmux = async (run: TmuxRun): Promise<TmuxResult> => {
	const until = Date.now() + run.timeoutMs;
	const env = Object.entries(run.env).flatMap(([k, v]) => ["-e", `${k}=${v}`]);
	const started = await tmux(
		run.socket,
		...["new-session", "-d", "-s", "claude", "-x", "200", "-y", "50"],
		...["-c", run.cwd, ...env, ...run.argv],
	);
	if (started.code !== 0) {
		return {
			code: started.code ?? 1,
			stderr: started.stderr,
			screen: "",
			timedOut: false,
		};
	}
	let screen = "";
	const read = async (): Promise<string> => {
		screen = (await tmux(run.socket, "capture-pane", "-p", "-t", "claude"))
			.stdout;
		return screen;
	};
	try {
		const ready = await waitFor(
			async () => (await read()).includes("❯"),
			until,
		);
		if (ready) {
			await tmux(run.socket, "send-keys", "-t", "claude", "-l", run.prompt);
			await sleep(TYPE_MS);
			await tmux(run.socket, "send-keys", "-t", "claude", "Enter");
		}
		const finished = ready && (await waitFor(run.done, until));
		await read();
		return { code: finished ? 0 : 1, stderr: "", screen, timedOut: !finished };
	} finally {
		await tmux(run.socket, "kill-server");
	}
};

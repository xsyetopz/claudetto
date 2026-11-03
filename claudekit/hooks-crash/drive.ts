// Drives one interactive `claude` through a list of prompts in a detached `tmux` session, as a person would type them.

import { sleep } from "bun";
import { alive, startTmux, tmux, waitFor } from "../session/tmux.ts";
import { screenState } from "./screen.ts";
import { type Action, newTurns, nextAction, type Turns } from "./turns.ts";

const POLL_MS = 2000;

const TYPE_MS = 500;
const EXIT_MS = 30_000;

export interface Drive {
	readonly argv: readonly string[];
	readonly cwd: string;
	readonly env: Readonly<Record<string, string>>;
	readonly socket: string;
	readonly prompts: readonly string[];
	/** A reason to end the session now, such as a crash in its log or a spent budget. */
	readonly stop: () => Promise<string | undefined>;
	readonly timeoutMs: number;
	/** Gets the pids of the `tmux` server and of `claude`, which a cleanup stops by number. */
	readonly onPids: (pids: { server: number; pane: number }) => Promise<void>;
	readonly log: (line: string) => void;
}

export interface Driven {
	/** `finished`, `timeout`, `exited`, or what `stop` returned. */
	readonly reason: string;
	readonly sent: number;
	readonly screen: string;
}

const pidOf = async (socket: string, format: string): Promise<number> =>
	Number(
		(await tmux(socket, "display", "-p", "-t", "claude", format)).stdout.trim(),
	);

const type = async (socket: string, text: string): Promise<void> => {
	await tmux(socket, "send-keys", "-t", "claude", "-l", text);
	await sleep(TYPE_MS);
	await tmux(socket, "send-keys", "-t", "claude", "Enter");
};

interface Progress extends Turns {
	screen: string;
}

const KEY_NAMES: Partial<Record<Action, string>> = {
	enter: "Enter",
	down: "Down",
	escape: "Escape",
};

/** Reads the screen once and answers it; returns `finished` once every prompt has run. */
const act = async (run: Drive, at: Progress): Promise<string | undefined> => {
	at.screen = (
		await tmux(run.socket, "capture-pane", "-p", "-t", "claude")
	).stdout;
	const action = nextAction(screenState(at.screen), at, run.prompts.length);
	if (action === "finished") {
		return action;
	}
	if (action === "escape") {
		run.log(`denied: ${at.screen.split("\n").slice(-12).join(" | ")}`);
	}
	const name = KEY_NAMES[action];
	if (name !== undefined) {
		await tmux(run.socket, "send-keys", "-t", "claude", name);
	}
	const prompt = run.prompts[at.sent - 1];
	if (action === "type" && prompt !== undefined) {
		run.log(`prompt ${at.sent}: ${prompt.slice(0, 80)}`);
		await type(run.socket, prompt);
	}
	return undefined;
};

const poll = async (
	run: Drive,
	at: Progress,
	pane: number,
	until: number,
): Promise<string> => {
	const reason =
		(await run.stop()) ??
		(Date.now() >= until ? "timeout" : undefined) ??
		(alive(pane) ? await act(run, at) : "exited");
	if (reason !== undefined) {
		return reason;
	}
	await sleep(POLL_MS);
	return poll(run, at, pane, until);
};

/** Answers the trust dialog, denies each permission question with Escape, types each prompt once the session has gone idle, and stops the server at the end. */
export const drive = async (run: Drive): Promise<Driven> => {
	const started = await startTmux(run);
	if (started.code !== 0) {
		return { reason: `tmux: ${started.stderr.trim()}`, sent: 0, screen: "" };
	}
	const pane = await pidOf(run.socket, "#{pane_pid}");
	await run.onPids({ server: await pidOf(run.socket, "#{pid}"), pane });
	const at: Progress = { ...newTurns(), screen: "" };
	try {
		const reason = await poll(run, at, pane, Date.now() + run.timeoutMs);
		return { reason, sent: at.sent, screen: at.screen };
	} finally {
		await tmux(run.socket, "kill-server");
		// `kill-server` only hangs up the pane; the session writes its transcript as it exits.
		await waitFor(() => !alive(pane), Date.now() + EXIT_MS);
	}
};

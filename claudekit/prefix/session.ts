// Drives one interactive `claude` in `tmux` through several turns against the fake API and keeps every request body.

import { mkdir, mkdtemp, realpath, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { sleep } from "bun";
import type { ToolCall } from "../api/answer.ts";
import { startFakeApi } from "../api/fake.ts";
import { claudeArgv } from "../session/argv.ts";
import { spawnCommand } from "../session/command.ts";
import { FAKE_KEY, fakeApiEnv } from "../session/env.ts";
import { interactiveConfig, tmuxArgv } from "../session/tmux.ts";
import { isMain } from "./report.ts";

const SETTLE_MS = 1500;
const POLL_MS = 250;
const WAIT_POLLS = 160;
const READY_POLLS = 80;

/** The folders of a run, for a step that writes a file the session should see. */
export interface Folders {
	readonly work: string;
	readonly config: string;
}

/** One thing done to the session: type text, press keys, or both, after an optional change to the folders. */
export interface Step {
	readonly text?: string;
	readonly keys?: readonly string[];
	/** `false` for a step that sends no request, such as a slash command, so the run does not wait for one. */
	readonly expect?: boolean;
	readonly before?: (folders: Folders) => Promise<void>;
}

export interface Scenario {
	readonly args?: readonly string[];
	readonly env?: Readonly<Record<string, string>>;
	readonly settings?: object;
	readonly calls?: readonly ToolCall[];
	readonly setup?: (folders: Folders) => Promise<void>;
	readonly steps: readonly Step[];
}

export interface Recorded {
	readonly root: string;
	/** Every body to the messages route, in order. */
	readonly all: readonly string[];
	/** The bodies of the main thread. */
	readonly mains: readonly string[];
	/** The screen with its scrollback. */
	readonly screen: string;
}

export const runScenario = async (scenario: Scenario): Promise<Recorded> => {
	const root = await mkdtemp("/tmp/claudetto-prefix-");
	const config = join(root, "config");
	const work = join(root, "work");
	await Promise.all([mkdir(config), mkdir(work)]);
	if (scenario.settings !== undefined) {
		await writeFile(
			join(config, "settings.json"),
			JSON.stringify(scenario.settings),
		);
	}
	// The session keys its trust by the real path.
	const real = await realpath(work);
	await writeFile(
		join(config, ".claude.json"),
		interactiveConfig(real, FAKE_KEY),
	);
	const folders = { work: real, config };
	await scenario.setup?.(folders);
	const log: string[] = [];
	const api = startFakeApi(scenario.calls, "ok", undefined, (raw) => {
		log.push(raw);
	});
	const socket = join(root, "tmux.sock");
	const tmux = (...args: readonly string[]) =>
		spawnCommand(tmuxArgv(socket, ...args), { cwd: "/" });
	const env = { ...fakeApiEnv(api.url, config), ...scenario.env };
	try {
		const started = await tmux(
			...["new-session", "-d", "-s", "claude", "-x", "200", "-y", "50"],
			...["-c", real],
			...Object.entries(env).flatMap(([k, v]) => ["-e", `${k}=${v}`]),
			...claudeArgv(scenario.args ?? []),
		);
		if (started.code !== 0) {
			throw new Error(started.stderr);
		}
		await ready(tmux);
		await inOrder(scenario.steps, (step) => perform(step, folders, tmux, log));
		const pane = await tmux("capture-pane", "-p", "-S", "-200", "-t", "claude");
		return {
			root,
			all: [...log],
			mains: log.filter(isMain),
			screen: pane.stdout,
		};
	} finally {
		await tmux("kill-server");
		await api.stop();
	}
};

/** Runs `each` on one item after another, since a session takes its input in order. */
export const inOrder = async <T>(
	items: readonly T[],
	each: (item: T) => Promise<void>,
): Promise<void> => {
	const [first, ...rest] = items;
	if (first === undefined) {
		return;
	}
	await each(first);
	await inOrder(rest, each);
};

type Tmux = (...args: readonly string[]) => Promise<{ stdout: string }>;

const waitFor = async (
	test: () => Promise<boolean> | boolean,
	polls: number,
): Promise<void> => {
	if (polls <= 0 || (await test())) {
		return;
	}
	await sleep(POLL_MS);
	await waitFor(test, polls - 1);
};

const ready = (tmux: Tmux): Promise<void> =>
	waitFor(
		async () =>
			(await tmux("capture-pane", "-p", "-t", "claude")).stdout.includes("❯"),
		READY_POLLS,
	);

const perform = async (
	step: Step,
	folders: Folders,
	tmux: Tmux,
	log: readonly string[],
): Promise<void> => {
	const seen = log.filter(isMain).length;
	await step.before?.(folders);
	if (step.text !== undefined) {
		await tmux("send-keys", "-t", "claude", "-l", step.text);
		await sleep(500);
		await tmux("send-keys", "-t", "claude", "Enter");
	}
	await inOrder(step.keys ?? [], async (name) => {
		await tmux("send-keys", "-t", "claude", name);
		await sleep(400);
	});
	if (step.expect !== false) {
		await waitFor(() => log.filter(isMain).length > seen, WAIT_POLLS);
	}
	await sleep(SETTLE_MS);
};

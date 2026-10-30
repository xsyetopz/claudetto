// Measures what the agent status-line summarizer costs, and whether either workaround stops it.
// Free and with no model call unless `--run` is given.

import { spawn } from "node:child_process";
import { mkdir, readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { mapInOrder } from "../probe/fixture/ordered.ts";
import {
	ARMS,
	type Arm,
	buildFixture,
	commandOf,
	forkOf,
	modeOf,
	RUN_MS,
} from "./arena.ts";
import { type Lines, linesOf, rowsOf, type Seen, seenIn } from "./log.ts";
import { start } from "./proxy.ts";
import { configPath, trust, untrust } from "./trust.ts";

/** What one run read back from its two logs: `lines` from the session's own `--debug` output and `seen` from the proxy's log. */
export interface Run {
	arm: Arm;
	run: number;
	lines: Lines;
	seen: Seen;
}

const read = async (file: string): Promise<string> => {
	try {
		return await readFile(file, "utf8");
	} catch {
		return "";
	}
};

/** Runs one arm once and reads its two logs. The session is stopped on the deadline, because a TUI does not exit by itself. */
export const runArm = async (
	arm: Arm,
	run: number,
	dir: string,
): Promise<Run> => {
	const at = path.join(dir, `${arm}-${run}`);
	await mkdir(at, { recursive: true });
	await buildFixture(at);
	const capture = path.join(at, "session.log");
	const proxyLog = path.join(at, "proxy.jsonl");
	const debugFile = path.join(at, "debug.log");
	// The session reports its folder by the real path, so that is the key the trust answer needs.
	const real = await realpath(at);
	await trust(configPath(), real);

	// One proxy per run, on its own port and its own log, so no count can belong to another arm.
	const proxy = start(modeOf(arm), proxyLog);
	const [command, ...args] = commandOf(capture, debugFile, forkOf(arm));
	try {
		await new Promise<void>((resolve) => {
			// The session talks to the pty that `pty.py` opened, so this process needs no stdio of its own.
			const child = spawn(command ?? "python3", args, {
				cwd: at,
				env: { ...process.env, ANTHROPIC_BASE_URL: proxy.url },
				stdio: ["ignore", "ignore", "inherit"],
			});
			// `pty.py` keeps the deadline itself. This is the backstop for a helper that hangs.
			const stop = setTimeout(() => child.kill(), RUN_MS + 30_000);
			const done = (): void => {
				clearTimeout(stop);
				resolve();
			};
			child.on("error", done);
			child.on("close", done);
		});
	} finally {
		// The folder is temporary, so its entry goes out of the config with it, round or no round.
		await untrust(configPath(), real);
		// Stopping waits for the last row, so the counts below are the counts of the whole arm.
		await proxy.stop();
	}

	return {
		arm,
		run,
		lines: linesOf(await read(debugFile)),
		seen: seenIn(rowsOf(await read(proxyLog))),
	};
};

/** The line a run reports: the requests the summarizer made, and what they were charged. */
export const lineOf = (r: Run): string =>
	[
		`${r.arm} ${r.run}:`,
		`${r.lines.fired} ticks`,
		`${r.lines.forked + r.lines.asked} requests`,
		`${r.lines.skipped} skipped`,
		`${r.lines.held} held`,
		`proxy started ${r.seen.started}, sent ${r.seen.sent}, stopped ${r.seen.stopped}`,
		`summary cache read ${r.seen.cacheRead} tokens`,
		`summary input ${r.seen.input} tokens`,
		`arm cache read ${r.seen.armCacheRead} tokens`,
		`arm input ${r.seen.armInput} tokens`,
		`seen ${r.seen.requests} requests, ${r.seen.unread} unread`,
	].join(", ");

/** The expected spend of a round, from the cap of each arm. */
const expectedUsd = (arms: number, runs: number): number => arms * runs * 0.6;

/**
 * The arms of a round. `--only <arm>` runs one of them, which is what a smoke costs: a round of six
 * arms that measures nothing because of one wrong assumption is six arms of spend, and three rounds
 * were lost that way.
 */
export const armsOf = (argv: string[]): Arm[] => {
	const only = argv[argv.indexOf("--only") + 1];
	const picked = ARMS.filter((arm) => arm === only);
	return argv.includes("--only") && picked.length > 0 ? picked : [...ARMS];
};

/** Plans a round of arms and runs, prints its ceiling cost in USD, and returns the exit code; a paid run needs `--run`. */
export const main = async (
	argv: string[],
	write: (s: string) => void,
): Promise<number> => {
	const paid = argv.includes("--run");
	const runs = Number(argv[argv.indexOf("--runs") + 1]) || 2;
	const dir = argv.includes("--dir")
		? (argv[argv.indexOf("--dir") + 1] ?? "")
		: "";
	const arms = armsOf(argv);

	write(
		`${arms.length} arms (${arms.join(", ")}) x ${runs} runs, at most ${expectedUsd(arms.length, runs).toFixed(2)} USD, each arm capped and stopped after ${RUN_MS / 1000}s.\n`,
	);
	write(
		"The session must be interactive and the agents must run in the background, because that is the only launch path in a terminal whose `enableSummarization` can be true.\n",
	);
	write(
		"Every arm runs through a local proxy on `ANTHROPIC_BASE_URL`, which is the only place the summarizer's request can be seen or priced, so the cost of a custom base URL is in each arm alike.\n",
	);
	if (!paid) {
		write("Free run: pass `--run` to pay for it.\n");
		return 0;
	}
	if (dir === "") {
		write("`--run` needs `--dir` so that the logs of the round are kept.\n");
		return 2;
	}

	// One arm at a time: each is a real session, and two at once would share the machine and the
	// plugin store, so a count could belong to either.
	const planned = arms.flatMap((arm) =>
		Array.from({ length: runs }, (_, i) => ({ arm, run: i + 1 })),
	);
	try {
		await mapInOrder(planned, async ({ arm, run }) => {
			const one = await runArm(arm, run, dir);
			write(`${lineOf(one)}\n`);
			return one;
		});
	} finally {
		// A round that is stopped mid-arm leaves that arm trusted, so the whole folder is swept here.
		await untrust(configPath(), await realpath(dir));
	}
	return 0;
};

if (import.meta.main) {
	process.exitCode = await main(process.argv.slice(2), (s) =>
		process.stdout.write(s),
	);
}

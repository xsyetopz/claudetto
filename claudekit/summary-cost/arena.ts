// One arm of the measurement: an interactive Claude Code session, driven under a pty, that runs
// agents while the agent status-line summarizer is on or off.
//
// The session has to be interactive. `enableSummarization` is
// `wEe()||(Get()||B||ace())&&!Se()` (`chunk-4a387j58.js:44005`) and `Se()` is
// `!isInteractive()`, and `Alt` makes a launch non-interactive when `-p` or `--print` is given or
// `!process.stdout.isTTY` (`chunk-8sp6csj0.js:3876`). So `claude -p` can never summarize, and the
// only way to measure is a pty.
//
// The pty comes from `pty.py`, not from `script`: BSD `script` reads the terminal settings of its
// own stdin, so it exits 1 and writes nothing when its parent is not a terminal, which a test
// runner never is. Two rounds were empty for exactly that reason.

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Mode } from "./proxy.ts";

/**
 * The arms. Each differs from `base` in one thing only, and all three run through the local proxy,
 * so the cost of a custom base URL is in every arm and cancels out of the comparison.
 *
 * `base` lets the summarizer run and prices it. `fork-off` turns the fork gate off, which is the
 * first workaround. `proxy` keeps the gate on and has the proxy answer the summarizer, which is the
 * second.
 */
export const ARMS = ["base", "fork-off", "proxy"] as const;

/** One of the three arms: `base`, `fork-off`, or `proxy`. */
export type Arm = (typeof ARMS)[number];

/**
 * The files the agents read. The count is what keeps an agent alive: the first tick of the
 * summarizer is 30 seconds after the launch (`var fn=30`, `chunk-1wgxyh0t.js:122662`), and a round
 * with 8 files per agent recorded no tick at all because both agents finished in under 19 seconds
 * (`agent_completion ... durationMs=17548 turns=10`). At about 1.8 seconds a turn, 40 files per
 * agent buy well past three ticks.
 */
const FILES = 80;

/** How long an arm is allowed to run before it is stopped, in milliseconds. */
export const RUN_MS = 360_000;

/** The cap of one arm, so a session that misreads the task cannot run away with the budget. */
const BUDGET_USD = "1.20";

const noteName = (i: number): string =>
	`notes/part-${String(i).padStart(2, "0")}.md`;

/** A note with one line that only this note has, so a report shows the file was really read. */
const note = (i: number): string =>
	[
		`Code ${1000 + i}: ${String(((1000 + i) * 7919) % 1_000_000).padStart(6, "0")}`,
		...Array.from(
			{ length: 40 },
			(_, n) => `Step ${i}.${n}: the build keeps cache ${(n * 13) % 89} warm.`,
		),
	].join("\n");

/**
 * The prompt of the arm.
 *
 * The agents have to run in the background. A blocking agent is launched through
 * `chunk-b79zbk1k.js:46993`, which passes `enableSummarization: wEe()`, and `wEe()` is
 * `host.launchOptions.sdkAgentProgressSummariesEnabled()`, an SDK option that no terminal session
 * sets, so a blocking agent never summarizes. A background agent goes through
 * `chunk-b79zbk1k.js:42912`, which passes `wEe()||(en||sn)&&!Se()`, and in an interactive session
 * `sn` is `ace()&&$ht()`, both true by default. One round asked for plain parallel agents and
 * recorded no tick at all.
 *
 * It asks for one `Read` per file because the summarizer drops a tick when the agent's transcript
 * has not changed (`Skipping summary ... transcript unchanged`), so a steady stream of tool calls
 * is what turns the ticks into requests.
 */
export const PROMPT =
	"Start two agents in the background, with `run_in_background: true` on each, and do none of the reading yourself. Give the first agent files 00 to 39 of `notes/` and the second files 40 to 79. Each agent must read its files one at a time, with one `Read` call per file and no parallel reads, and report for each file the `Code` line and how many of its `Step` lines keep a cache number that is divisible by 7. Wait for both agents, then list every `Code` line you received.";

/** Writes the fixture the agents read. */
export const buildFixture = async (dir: string): Promise<void> => {
	await mkdir(path.join(dir, "notes"), { recursive: true });
	await Promise.all(
		Array.from({ length: FILES }, (_, i) =>
			writeFile(path.join(dir, noteName(i)), note(i)),
		),
	);
};

/**
 * The mode the proxy runs in for an arm. `pass` forwards the summarizer's requests and reads the
 * tokens of each answer, which is what prices a summary. `off` answers them at the proxy.
 */
export const modeOf = (arm: Arm): Mode => (arm === "proxy" ? "off" : "pass");

/**
 * The fork gate of an arm, which decides whether the summarizer can run at all: `ace()` is
 * `mon()!=="disabled"`, and it is one of the three disjuncts of `enableSummarization`.
 *
 * It travels in `--settings` and not in the environment, because a settings `env` block overwrites
 * an inherited variable (`process.env[r]=a`, `chunk-b9rj0bam.js:43598`), and this machine's own
 * `~/.claude/settings.json` already sets `CLAUDE_CODE_FORK_SUBAGENT` to `0`. A round that set the
 * variable in the environment measured three arms with the summarizer off in all of them.
 * `--settings` is the `flagSettings` source, which the bundle documents as higher priority than
 * `userSettings` (`chunk-b09ckz08.js:665663`).
 */
export const forkOf = (arm: Arm): string => (arm === "fork-off" ? "0" : "1");

/**
 * The command of an arm. `pty.py` opens the pty, so `process.stdout.isTTY` holds in the session,
 * copies the screen into `capture`, and stops the session on the deadline. `-I` keeps the
 * interpreter from loading anything out of the fixture folder.
 *
 * `--debug-file` is what makes the counts readable. `--debug` on its own keeps the lines inside the
 * TUI, so a capture of the drawn screen holds no debug line at all, which cost one round.
 */
export const commandOf = (
	capture: string,
	debugFile: string,
	fork: string,
): string[] => [
	"python3",
	"-I",
	path.join(import.meta.dir, "pty.py"),
	capture,
	String(RUN_MS / 1000),
	"claude",
	"--debug-file",
	debugFile,
	"--settings",
	JSON.stringify({ env: { CLAUDE_CODE_FORK_SUBAGENT: fork } }),
	"--permission-mode",
	"acceptEdits",
	"--max-budget-usd",
	BUDGET_USD,
	PROMPT,
];

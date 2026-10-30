import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Mode } from "./proxy.ts";

export const ARMS = ["base", "fork-off", "proxy"] as const;

export type Arm = (typeof ARMS)[number];

const FILES = 80;

export const RUN_MS = 360_000;

/** The cap of one arm, so a session that misreads the task cannot run away with the budget. */
const BUDGET_USD = "1.20";

const noteName = (i: number): string =>
	`notes/part-${String(i).padStart(2, "0")}.md`;

const note = (i: number): string =>
	[
		`Code ${1000 + i}: ${String(((1000 + i) * 7919) % 1_000_000).padStart(6, "0")}`,
		...Array.from(
			{ length: 40 },
			(_, n) => `Step ${i}.${n}: the build keeps cache ${(n * 13) % 89} warm.`,
		),
	].join("\n");

/** The agents must run in the background, because a blocking agent never enables summarization. */
export const PROMPT =
	"Start two agents in the background, with `run_in_background: true` on each, and do none of the reading yourself. Give the first agent files 00 to 39 of `notes/` and the second files 40 to 79. Each agent must read its files one at a time, with one `Read` call per file and no parallel reads, and report for each file the `Code` line and how many of its `Step` lines keep a cache number that is divisible by 7. Wait for both agents, then list every `Code` line you received.";

export const buildFixture = async (dir: string): Promise<void> => {
	await mkdir(path.join(dir, "notes"), { recursive: true });
	await Promise.all(
		Array.from({ length: FILES }, (_, i) =>
			writeFile(path.join(dir, noteName(i)), note(i)),
		),
	);
};

export const modeOf = (arm: Arm): Mode => (arm === "proxy" ? "off" : "pass");

/** Travels in `--settings`, because a settings `env` block overwrites an inherited variable. */
export const forkOf = (arm: Arm): string => (arm === "fork-off" ? "0" : "1");

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

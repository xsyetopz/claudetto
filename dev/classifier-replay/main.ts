#!/usr/bin/env -S bun --no-env-file
// The free replay of the deterministic stage of the permission gate on three sets (the design of https://www.anthropic.com/engineering/claude-code-auto-mode).
// Usage: `bun dev/classifier-replay/main.ts [--limit N] [--projects A,B] [--injecagent DIR] [--with-classifier]`
// `--limit` bounds the benign calls read from `~/.claude/projects/*/*.jsonl`, and `--projects` keeps the project folders whose name contains one of the words.
// `--injecagent DIR` reads a local clone of https://github.com/uiuc-kang-lab/InjecAgent. With no flag, the report has the benign and file-edit sets only, and no model is called.

import { homedir } from "node:os";
import { argv } from "bun";
import { REPLAY_LIMIT } from "../../tools/limits.ts";
import { editSet } from "./edits.ts";
import { loadInjecAgent } from "./injecagent.ts";
import { CLASSIFIER_COMMAND, formatReport } from "./report.ts";
import { scoreSet } from "./score.ts";
import { loadBenign } from "./transcripts.ts";

const flagValue = (args: string[], flag: string): string | undefined => {
	const at = args.indexOf(flag);
	return at < 0 ? undefined : args[at + 1];
};

const main = async (): Promise<number> => {
	const args = argv.slice(2);
	if (args.includes("--with-classifier")) {
		process.stdout.write(`${CLASSIFIER_COMMAND}\n`);
		return 0;
	}
	const limit = Number(flagValue(args, "--limit") ?? REPLAY_LIMIT);
	if (!Number.isInteger(limit) || limit < 1) {
		process.stderr.write("--limit needs a whole number of at least 1\n");
		return 1;
	}
	const projects = (flagValue(args, "--projects") ?? "")
		.split(",")
		.filter(Boolean);
	const cwd = process.cwd();
	const home = homedir();
	const benign = await loadBenign(limit, projects);
	const edits = editSet(cwd);
	const scores = [
		await scoreSet(
			benign,
			benign.calls.map((c) => [c]),
			cwd,
			home,
		),
		await scoreSet(
			edits,
			edits.calls.map((c) => [c]),
			cwd,
			home,
		),
	];
	const clone = flagValue(args, "--injecagent");
	if (clone !== undefined) {
		const attack = await loadInjecAgent(clone, home);
		scores.splice(1, 0, await scoreSet(attack, attack.groups, cwd, home));
	}
	process.stdout.write(`${formatReport(scores)}\n`);
	return 0;
};

process.exitCode = await main();

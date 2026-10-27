#!/usr/bin/env -S bun --no-env-file

// The free handoff probe (openspec change `eval-rebuild`, task 3.1). It plants a constraint, a fact, a file, a decision, and the next task in a seeded session, builds the handoff with code, and checks with code that each one is in its section.
// The design is ConstraintRot (plant, compact, check by code) with the four probes of Factory and a fifth, the constraint. It makes no model call.
//
//   bun dev/handoff-probe/main.ts                         synthetic sessions: survival for each kind and depth, and the lost items
//   bun dev/handoff-probe/main.ts --seeds N               N seeds for each size (HANDOFF_PROBE_SEEDS by default)
//   bun dev/handoff-probe/main.ts --sessions [--limit N]  replay the newest N real transcripts under `~/.claude/projects/` (read only), counts only
//   bun dev/handoff-probe/main.ts --with-compact          print the command of the paid comparison against `/compact`, and make no call

import { DECISIONS_MAX } from "../../plugins/claudetto/modules/session/handoff/limits.ts";
import {
	HANDOFF_PROBE_SEEDS,
	HANDOFF_PROBE_SESSIONS_MAX,
	HANDOFF_PROBE_SIZES,
} from "../../tools/limits.ts";
import { replayAll } from "./replay.ts";
import {
	handoffOf,
	type Rate,
	rates,
	type Scored,
	scoreItems,
} from "./score.ts";
import { DEPTHS, KINDS, sessionOf } from "./session.ts";

const pct = (r: Rate): string =>
	`${(r.share * 100).toFixed(1).padStart(5)}%  ${r.kept}/${r.n}  [${(r.low * 100).toFixed(1)}, ${(r.high * 100).toFixed(1)}]`;

const EMPTY: Rate = { n: 0, kept: 0, share: 0, low: 0, high: 1 };

const one = (scored: readonly { kept: boolean }[]): Rate =>
	rates(scored)[0] ?? EMPTY;

/** The note of `--with-compact`: the comparison with the built-in `/compact` needs a model call, so it is not built. */
export const compactNote = (): string =>
	[
		"The comparison against the built-in `/compact` is a paid step and is not implemented. No call was made.",
		"It would run the paid probe: just probe --run --dir <folder> --runs <N>",
		"That run costs money, so it needs the approval of the user.",
	].join("\n");

const numberAfter = (
	args: string[],
	flag: string,
	fallback: number,
): number => {
	const value = Number(args[args.indexOf(flag) + 1]);
	return args.includes(flag) && Number.isInteger(value) && value > 0
		? value
		: fallback;
};

const synthetic = (seeds: number): string[] => {
	const all: Scored[] = [];
	for (const size of HANDOFF_PROBE_SIZES) {
		for (let seed = 1; seed <= seeds; seed++) {
			const session = sessionOf(seed, size);
			all.push(...scoreItems(session, handoffOf(session)));
		}
	}
	const lines = [
		`Synthetic sessions: sizes ${HANDOFF_PROBE_SIZES.join(", ")} turns, ${seeds} seeds each, ${all.length} items`,
		"",
		"kind          depth    survival  kept/n  Wilson 95%",
	];
	for (const kind of KINDS) {
		for (const depth of DEPTHS) {
			const part = all.filter(
				(s) => s.item.kind === kind && s.item.depth === depth,
			);
			lines.push(`${kind.padEnd(13)} ${depth.padEnd(8)} ${pct(one(part))}`);
		}
	}
	lines.push("", "depth    survival  kept/n  Wilson 95%");
	for (const depth of DEPTHS) {
		lines.push(
			`${depth.padEnd(8)} ${pct(one(all.filter((s) => s.item.depth === depth)))}`,
		);
	}
	lines.push("", "kind          size  survival  kept/n  Wilson 95%");
	for (const kind of KINDS) {
		for (const size of HANDOFF_PROBE_SIZES) {
			const part = all.filter(
				(s) => s.item.kind === kind && s.item.size === size,
			);
			lines.push(
				`${kind.padEnd(13)} ${String(size).padEnd(4)} ${pct(one(part))}`,
			);
		}
	}
	const lost = all.filter((s) => !s.kept);
	lines.push("", `Lost items: ${lost.length}`);
	for (const { item } of lost) {
		lines.push(
			`lost ${item.kind} ${item.depth} size=${item.size} seed=${item.seed} section="${item.section}" token=${item.tokens.join(" ")}`,
		);
	}
	return lines;
};

const replay = async (limit: number): Promise<string[]> => {
	const found = await replayAll(limit);
	const newest = found.decisions.filter((d) => d.rank <= DECISIONS_MAX);
	return [
		`Real sessions: ${found.sessions} replayed, ${found.skipped} too large to replay (counts only)`,
		`decisions, all:                    ${pct(one(found.decisions))}`,
		`decisions, newest ${DECISIONS_MAX} of a session:  ${pct(one(newest))}`,
		`next task after a tick:            ${pct(one(found.ticks))}`,
	];
};

const run = async (args: string[]): Promise<string[]> => {
	if (args.includes("--with-compact")) {
		return [compactNote()];
	}
	if (args.includes("--sessions")) {
		return replay(numberAfter(args, "--limit", HANDOFF_PROBE_SESSIONS_MAX));
	}
	return synthetic(numberAfter(args, "--seeds", HANDOFF_PROBE_SEEDS));
};

if (import.meta.main) {
	process.stdout.write(`${(await run(process.argv.slice(2))).join("\n")}\n`);
}

#!/usr/bin/env bun

// The inventory check: it compares each recorded total of the prompt-size inventory against a reading
// taken now, and refuses a row that has moved by more than the instrument's own variance.
//
// It exists because the inventory drifted 1,382 characters while every check of `just check` passed.
// The test that was supposed to hold it, `tests/claudetto/cuts.test.ts:14`, asserts
// `BASELINE_TOTAL - shippedChars() === SHIPPED_TOTAL`, and that is an identity among three constants
// of one file: adding a row and subtracting it from the total keeps it true however far the tree has
// moved from the request those constants describe. Only a reading can fail.
//
// Where it runs: here and not in `just check`. It spawns `claude` once per row, so it needs the
// program on the PATH and about a minute of wall time, while `just check` is the gate every edit goes
// through. It runs as `just inventory`, by hand, after a change to a shipped prompt surface: an agent
// file, the output style, the deny list, the main agent body, or a tool description. The comparison
// itself is pure, so `inventoryFaults` is tested without a run and only the reading needs the spawn.
//
//   just inventory

import { SHIPPED_TOTAL } from "../../plugins/claudetto/src/cuts.ts";
import {
	BASELINE_TOTAL,
	DENIED_TOGETHER_TOTAL,
	denyList,
} from "../../plugins/claudetto/src/deny.ts";
import { type Arm, capture } from "./arm.ts";
import { denySettings, shippedSettings } from "./settings.ts";

/**
 * The slack a row is allowed, in characters. It is slack and not a measured band: the first run of
 * this check read the shipped arm three times in a row and got 30,450 every time, with `system`,
 * `tools`, and `messages` identical at 5,708, 13,009, and 11,029, and the plain and deny arms
 * reproduced 42,687 and 30,521 to the character. So the instrument is deterministic for a fixed tree
 * and a fixed program, and the 12 characters that `cuts.ts` had called run-to-run variance were a
 * change of the tree between two dates. The slack stays anyway, because a reading also carries the
 * working folder path and the `claude` version, and 12 characters is small against the 1,382 of drift
 * this check exists to catch, which is 115 times it. A row that lands exactly 12 off is the signal
 * that a figure went stale rather than that the instrument moved, so correct the row.
 */
export const VARIANCE_CHARS = 12;

/** One recorded total of the inventory, with the arm and settings that produced it. */
export interface Row {
	readonly name: string;
	/** The figure the tree records, which the reading has to reproduce. */
	readonly recorded: number;
	readonly arm: Arm;
	/** The settings text of the run, or none for a run on the defaults. */
	readonly settings: string | undefined;
}

/**
 * The rows a capture can read on its own. Each is a whole first request rather than a piece of one,
 * which is the limit of the instrument: the per-cut rows of `SHIPPED_CUTS` were read by moving a file
 * aside between two runs, and a check that moved files of the tree aside would be a check that can
 * leave the tree broken. So the three totals are held here and the pieces stay held by the identity
 * of `tests/claudetto/cuts.test.ts`, which is sound once its two ends are read.
 */
export const rows = (): readonly Row[] => [
	{
		name: "baseline",
		recorded: BASELINE_TOTAL,
		arm: "plain",
		settings: undefined,
	},
	{
		name: "deny list",
		recorded: DENIED_TOGETHER_TOTAL,
		arm: "plain",
		settings: denySettings(denyList()),
	},
	{
		name: "shipped",
		recorded: SHIPPED_TOTAL,
		arm: "plugin",
		settings: shippedSettings(),
	},
];

/** One row beside what the capture read for it. `read` is none when the arm sent no request. */
export interface Checked {
	readonly name: string;
	readonly recorded: number;
	readonly read: number | undefined;
}

/**
 * One line per row that does not hold, naming the row, its recorded figure, and its read figure, so
 * the reader can see which way it moved without running the capture again. A row the arm sent no
 * request for is a fault as well, because an unread row is not a row that holds.
 */
export const inventoryFaults = (
	checked: readonly Checked[],
	variance: number = VARIANCE_CHARS,
): string[] =>
	checked.flatMap((one) => {
		if (one.read === undefined) {
			return [
				`${one.name}: recorded ${one.recorded}, read nothing, because the arm sent no request`,
			];
		}
		const off = one.read - one.recorded;
		return Math.abs(off) <= variance
			? []
			: [
					`${one.name}: recorded ${one.recorded}, read ${one.read}, off by ${off}, which is over the ${variance} characters of slack`,
				];
	});

if (import.meta.main) {
	const all = rows();
	console.info(
		`Each row runs \`claude -p\` against a fake Messages API on 127.0.0.1. No provider is reached.
Reading ${all.length} rows, allowing ${VARIANCE_CHARS} characters of slack per row.`,
	);
	// The rows run together, each in folders and on a fake API of its own, so three runs cost the wall
	// time of one. They are printed afterwards in the order they are recorded, so the output of two
	// runs can be read side by side whichever order the processes finished in.
	const checked: Checked[] = await Promise.all(
		all.map(async (row) => {
			const reading = await capture(row.arm, row.settings);
			return {
				name: row.name,
				recorded: row.recorded,
				read: reading.score?.total,
			};
		}),
	);
	for (const [at, row] of all.entries()) {
		console.info(
			`  ${row.name.padEnd(10)} | arm ${row.arm.padEnd(6)} | recorded ${row.recorded} | read ${checked[at]?.read ?? "none"}`,
		);
	}
	const faults = inventoryFaults(checked);
	for (const fault of faults) {
		console.error(fault);
	}
	if (faults.length > 0) {
		console.error(
			"Re-read the rows with `just capture`, then correct the constants and the rows of `plugins/claudetto/src/cuts.ts` and `plugins/claudetto/src/deny.ts` together, so the total and the pieces move as one.",
		);
		process.exitCode = 1;
	} else {
		console.info("Every row holds within the slack.");
	}
}

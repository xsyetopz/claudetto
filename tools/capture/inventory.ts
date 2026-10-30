#!/usr/bin/env bun

// Run by hand after a prompt-surface change, not in `just check`: it spawns `claude` once per row.
// Usage: just inventory

import { SHIPPED_TOTAL } from "../../plugins/claudetto/src/cuts.ts";
import {
	BASELINE_TOTAL,
	DENIED_TOGETHER_TOTAL,
	denyList,
} from "../../plugins/claudetto/src/deny.ts";
import { type Arm, capture } from "./arm.ts";
import { denySettings, shippedSettings } from "./settings.ts";

/** Slack, in characters, not a measured band: the instrument is deterministic for a fixed tree. */
export const VARIANCE_CHARS = 12;

export interface Row {
	readonly name: string;
	readonly recorded: number;
	readonly arm: Arm;
	readonly settings: string | undefined;
}

/** Only whole first requests are rows: reading a piece would mean moving files of the tree aside. */
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

export interface Checked {
	readonly name: string;
	readonly recorded: number;
	readonly read: number | undefined;
}

/** A row the arm sent no request for is a fault, because an unread row is not a row that holds. */
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
	// Rows are printed in recorded order whichever process finishes first, so two runs compare.
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

import type { On, PluginOptions } from "claude-code";

import { fault } from "../shared/fault";

const HELD = new Set(["Bash", "Monitor", "Agent"]);
const DEFAULT_MIN = 20;

/** Reads the free share from `memory_pressure -Q` output; undefined when the text names none. */
export const freeShare = (text: string): number | undefined => {
	const match = /free percentage:\s*(\d+)%/u.exec(text);
	return match?.[1] === undefined ? undefined : Number(match[1]);
};

/** The hold's floor in percent; a missing or invalid option gives the default, 0 turns the hold off. */
export const floor = (value: unknown): number =>
	typeof value === "number" &&
	Number.isFinite(value) &&
	value >= 0 &&
	value <= 100
		? value
		: DEFAULT_MIN;

/** The reason a call waits, written as the next step because the model reads it. */
export const reason = (free: number, min: number): string =>
	`Memory is ${free}% free, under the ${min}% floor. Wait for running commands to finish, then retry; another heavy run now can freeze the machine.`;

/**
 * Holds a new Bash, Monitor or Agent call while free memory is under the floor
 * (REQ-GUARDS-020). An unreadable share passes, and a failed read never blocks:
 * the hold protects the machine and must not break a session when it cannot measure.
 */
export function registerMemory(on: On, options: PluginOptions = {}): void {
	const min = floor(options["memoryFreeMinPercent"]);
	if (min === 0) {
		return;
	}
	on("tool.call", async ($, e, next) => {
		if (!HELD.has(e.tool)) {
			return next(e);
		}
		const run = await $.process.run(["memory_pressure", "-Q"]);
		const free = run.exitCode === 0 ? freeShare(run.stdout) : undefined;
		return free !== undefined && free < min
			? { deny: reason(free, min) }
			: next(e);
	}).catch(($, e, next) => {
		fault($, "memory hold", next.error);
		return next(e);
	});
}

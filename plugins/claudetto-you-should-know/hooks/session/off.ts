/** Turning the plugin off: the one-press way out and the typed /plugin disable. */

import type { EngineInterface } from "claude-code";

import { EARLIER_NAMES, OFF_COMMAND, PLUGIN_NAME } from "../shared/constants";
import { rowOf, withRow } from "./rows";
import { fault } from "../shared/fault";

export type OffState = {
	readonly clearing: Map<string, Promise<void>>;
	readonly confirmed: Set<string>;
};

export const newOffState = (): OffState => ({ clearing: new Map(), confirmed: new Set() });

const OWN_NAMES: readonly string[] = [PLUGIN_NAME, ...EARLIER_NAMES];

/** True for a /plugin disable aimed at this plugin by any of its names. */
export function isOffCommand(text: string): boolean {
	const [a, b, c] = text.trim().split(/\s+/);
	if (a !== "/plugin" || b !== "disable" || c === undefined) {
		return false;
	}
	return (
		OFF_COMMAND === `${a} ${b} ${c}` ||
		OWN_NAMES.some((n) => c === n || c.startsWith(`${n}@`))
	);
}

async function takeDown(
	$: EngineInterface,
	args: { readonly sid: string; readonly confirmed: Set<string>; readonly isConfirmed: boolean },
): Promise<void> {
	const rows = await $.store.get("sessions");
	const row = rowOf(rows, args.sid);
	if (row?.view?.kind !== "off") {
		return;
	}
	await $.store.set("sessions", withRow(rows, { ...row, id: args.sid, view: undefined }));
	$.ui.invalidate("ui.render");
	if (args.isConfirmed) {
		args.confirmed.add(args.sid);
	}
}

/** Takes the "off" line down once a /plugin disable went through, or at the next prompt. */
export async function clearOffLine(
	$: EngineInterface,
	state: OffState,
	args: { readonly isConfirmed: boolean },
): Promise<void> {
	try {
		const sid = await $.session.id();
		if (!args.isConfirmed) {
			state.confirmed.delete(sid);
		}
		const running = state.clearing.get(sid);
		if (running !== undefined) {
			await running;
			return;
		}
		const job = takeDown($, { sid, confirmed: state.confirmed, isConfirmed: args.isConfirmed });
		state.clearing.set(sid, job);
		try {
			await job;
		} finally {
			state.clearing.delete(sid);
		}
	} catch (err) {
		// the line stays until the next prompt
		fault($, "off clear", err);
	}
}

export async function ranOffCommand($: EngineInterface, state: OffState): Promise<void> {
	await clearOffLine($, state, { isConfirmed: true });
	try {
		const sid = await $.session.id();
		if (!state.confirmed.has(sid)) {
			state.confirmed.add(sid);
		}
	} catch (err) {
		// nothing more to record
		fault($, "off command", err);
	}
}

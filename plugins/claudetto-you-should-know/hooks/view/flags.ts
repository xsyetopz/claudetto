/** What the band reads before it draws: the debug and opt-in switches, and a stale in-flight view. */

import type { EngineInterface } from "claude-code";

import { isOptIn, switchOf } from "../check/backoff";
import { type Check, checksOf } from "../check/log";
import { type Row, rowOf, withRow } from "../session/rows";
import { swallow } from "../shared/fault";

export interface Flags {
	readonly isOptIn: boolean;
	readonly checks: readonly Check[];
}

/** The debug log shows only with the debug switch on; the opt-in follows the user type. */
export async function flagsOf(
	$: EngineInterface,
	row: Row | undefined
): Promise<Flags> {
	const debug = await switchOf($.env.get("CLAUDE_CODE_YOU_SHOULD_KNOW_DEBUG"));
	const optIn = isOptIn(
		await $.env.get("USER_TYPE").catch(swallow($, "user type"))
	);
	return { isOptIn: optIn, checks: debug ? checksOf(row?.checks) : [] };
}

/** Clears the view of a run no one is attending, once a second read confirms it is still unattended. */
export async function clearUnattended(
	$: EngineInterface,
	sid: string,
	isStillUnattended: (view: Row["view"]) => boolean
): Promise<void> {
	const fresh = rowOf(await $.store.get("sessions"), sid)?.view;
	if (!isStillUnattended(fresh)) {
		return;
	}
	const all = await $.store.get("sessions");
	await $.store.set(
		"sessions",
		withRow(all, { ...(rowOf(all, sid) ?? { id: sid }), view: undefined })
	);
}

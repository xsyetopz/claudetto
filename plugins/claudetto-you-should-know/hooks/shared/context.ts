/** The in-memory state the hooks of one plugin instance share. */

import type { Timer } from "claude-code";

import { newOffState, type OffState } from "../session/off";
import type { Watched } from "../session/rows";

export interface Ctx {
	/** Sessions with a model check in flight. */
	readonly checking: Map<string, Promise<void>>;
	/** Sessions whose explanation is being written by this instance. */
	readonly explaining: Set<string>;
	/** The timers that dismiss an "asked" row on its own. */
	readonly askedTimers: Map<string, Timer>;
	/** Sessions filling the prompt box with a note now. */
	readonly responding: Set<string>;
	/** Prompts a person sent since the note was shown. */
	readonly promptsSince: Map<
		string,
		{ readonly origin: string; readonly count: number }
	>;
	readonly ended: Set<string>;
	readonly off: OffState;
	/** Surfaces that drew the band. */
	readonly rendered: Set<string>;
	/** Sessions last prompted from a bridge. */
	readonly bridge: Set<string>;
	/** How long each closed offer sat unattended. */
	readonly idle: Map<string, Watched>;
	/** Notes already sent along with a prompt. */
	readonly autoSent: Set<string>;
	/** The tail of the main agent's reply text since each session's note was shown, for the recheck. */
	readonly since: Map<string, string>;
}

export const newCtx = (): Ctx => ({
	checking: new Map(),
	explaining: new Set(),
	askedTimers: new Map(),
	responding: new Set(),
	promptsSince: new Map(),
	ended: new Set(),
	off: newOffState(),
	rendered: new Set(),
	bridge: new Set(),
	idle: new Map(),
	autoSent: new Set(),
	since: new Map()
});

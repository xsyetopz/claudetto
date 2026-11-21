import type { On } from "claude-code";

import { fault } from "../shared/fault";

/**
 * A compaction within this many steps of the previous one counts toward the
 * engine's thrash limit.
 * ENGINE(v2.1.330): "Autocompact is thrashing: the context refilled to the limit within 3
 * turns of the previous compact, 3 times in a row" ends the subagent with an API error.
 */
export const THRASH_STEPS = 3;

/** The note a thrashing subagent reads beside its next tool result, within 200 characters. */
export const THRASH_NOTE =
	"An output is too large for your context. Read files in chunks (offset/limit), filter output (grep or head with a cap), or report what you have now.";

/** What the watch knows of one subagent. */
interface Track {
	/** Steps the subagent has taken so far. */
	steps: number;
	/** The step count at its last automatic compaction, or undefined before the first. */
	lastCompact: number | undefined;
	/** A thrash streak is on and its note has not been shown yet. */
	pending: boolean;
	/** The streak's note has been shown. */
	shown: boolean;
}

/** Each subagent's track, by agent id. */
const tracks = new Map<string, Track>();

const trackOf = (id: string): Track => {
	const found = tracks.get(id);
	if (found !== undefined) {
		return found;
	}
	const fresh: Track = {
		steps: 0,
		lastCompact: undefined,
		pending: false,
		shown: false
	};
	tracks.set(id, fresh);
	return fresh;
};

/**
 * The thrash note a subagent owes its next tool result, or undefined. It marks
 * the note shown, so a streak yields one.
 */
export function thrashNote(agentId: string): string | undefined {
	const track = tracks.get(agentId);
	if (track === undefined || !track.pending) {
		return undefined;
	}
	track.pending = false;
	track.shown = true;
	return THRASH_NOTE;
}

/**
 * Tracks each subagent's steps (`turn.step`) and automatic compactions
 * (`session.compact` with an `agentId`) to find a context that refills right
 * after each compaction, before the engine ends the subagent for thrashing.
 * The note itself rides on a tool result (`thrashNote`). The main loop is out of scope.
 */
export function registerThrash(on: On): void {
	on("turn.step", async function* (_$, e, next) {
		if (e.agentId !== undefined) {
			trackOf(e.agentId).steps += 1;
		}
		return yield* next(e);
	}).catch(async function* ($, e, next) {
		fault($, "thrash step count", next.error);
		return yield* next(e);
	});
	on("session.compact", { trigger: "auto" }, (_$, e, next) => {
		if (e.agentId !== undefined) {
			const track = trackOf(e.agentId);
			const gap =
				track.lastCompact === undefined
					? undefined
					: track.steps - track.lastCompact;
			if (gap !== undefined && gap <= THRASH_STEPS) {
				track.pending = !track.shown;
			} else {
				track.pending = false;
				track.shown = false;
			}
			track.lastCompact = track.steps;
		}
		return next(e);
	}).catch(($, e, next) => {
		fault($, "thrash compaction", next.error);
		return next(e);
	});
}

// What the plugin holds only while the process runs, because none of it is worth a store key: the
// prompts typed past an open offer, the sessions that ended, the checks in flight, and the digest log.
// A restart forgets all of it, which costs at most one offer shown a little longer.

/** Prompts typed past an open offer per session id, in memory only; the end of the session deletes the entry. */
export const typedPast = new Map<string, number>();
/** Ids of the sessions that ended, so a check that comes back after the end can drop its result. */
export const ended = new Set<string>();
/** Ids of the sessions with a check running, so a second check is not started for one (`holdFor` reads it as `in-flight`). */
export const inFlight = new Set<string>();

/** The recent work as entries, oldest first. */
export const work: { entries: readonly string[] } = { entries: [] };

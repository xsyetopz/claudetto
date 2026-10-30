// A restart forgets all of it, which costs at most one offer shown a little longer.

export const typedPast = new Map<string, number>();
export const ended = new Set<string>();
export const inFlight = new Set<string>();

export const work: { entries: readonly string[] } = { entries: [] };

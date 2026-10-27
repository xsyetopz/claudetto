// The shared types of the hooks of the modules. No runtime import.

import type { EventName, Events } from "claude-code";

/** The hook signature of the event `E`, as the mod API declares it. */
export type Handler<E extends EventName = EventName> = Events[E];

/** One segment of the status line, on the row `row`. */
export interface StatusSegment {
	readonly id: string;
	readonly row: number;
	readonly render: (status: unknown) => string | null;
}

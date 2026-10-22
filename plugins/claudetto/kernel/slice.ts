// The shared types of the hooks of a slice.
// This file has no runtime import, so the hooks module can load it.

import type { EventName, Events } from "claude-code";

/** The hook signature of the event `E`, as the mod API declares it. */
export type Handler<E extends EventName = EventName> = Events[E];

/** One segment of the status line. The `row` is the row of the status line that holds it. */
export interface StatusSegment {
  readonly id: string;
  readonly row: number;
  readonly render: (status: unknown) => string | null;
}

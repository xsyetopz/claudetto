// The contract of a slice manifest: what a slice folder exports from its `slice.ts`.
// The generator reads each manifest, and the types of the mod API come from `claude-code`.
// This file has no runtime import, so the hooks module can load it.

import type {
  Args,
  EventName,
  Events,
  Matcher,
  PluginOptions,
} from "claude-code";

/** The order of the phases of a mod handler, from the first to the last. The generator sorts by it. */
export const PHASES = [
  "observe",
  "normalize",
  "rewrite",
  "check",
  "answer",
] as const;

/** One phase of a mod handler, from `PHASES`. */
export type Phase = (typeof PHASES)[number];

/** The filter of a mod handler: a matcher over the argument of the event `E`. */
export type EventFilter<E extends EventName = EventName> = Matcher<Args<E>>;

/** The hook signature of the event `E`, as the mod API declares it. */
export type Handler<E extends EventName = EventName> = Events[E];

/** The hook of a handler that reads the `userConfig` values of its plugin, which the mod runtime gives to `register`. */
export type Configure<E extends EventName = EventName> = (
  options: PluginOptions,
) => Handler<E>;

/**
 * One mod handler of a slice. A slice can have more than one for one event, each with its own filter.
 * It has `run`, the hook, or `configure`, when the hook reads the `userConfig` values of the plugin.
 */
export type ModHandler<E extends EventName = EventName> = {
  readonly event: E;
  readonly filter?: EventFilter<E>;
  readonly phase: Phase;
} & (
  | { readonly run: Handler<E>; readonly configure?: never }
  | { readonly configure: Configure<E>; readonly run?: never }
);

/** One classic command hook, for an event that the mod API does not cover. */
export interface ClassicHook {
  readonly event: string;
  readonly matcher?: string;
  readonly command: string;
  readonly timeout?: number;
  readonly async?: boolean;
}

/** One segment of the status line. The `row` is the row of the status line that holds it. */
export interface StatusSegment {
  readonly id: string;
  readonly row: number;
  readonly render: (status: unknown) => string | null;
}

/** One `userConfig` field of a plugin manifest, such as the `backend` of `dotclaude-browser`. */
export interface UserConfigOption {
  readonly type: "string" | "number" | "boolean";
  readonly title: string;
  readonly description?: string;
  readonly default: string | number | boolean;
  readonly options?: readonly string[];
}

/** The manifest of one slice: the name, and each part that the slice adds to the plugin. */
export interface Slice {
  readonly name: string;
  readonly mod?: readonly ModHandler[];
  readonly hooks?: readonly ClassicHook[];
  readonly cli?: { readonly bin: string };
  readonly segments?: readonly StatusSegment[];
  readonly skills?: readonly string[];
  readonly agents?: readonly string[];
  readonly outputStyles?: readonly string[];
  readonly userConfig?: Readonly<Record<string, UserConfigOption>>;
  readonly settings?: Readonly<Record<string, unknown>>;
}

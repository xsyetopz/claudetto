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

/**
 * Keeps the `userConfig` values of the plugin, which the mod runtime gives to `register`, for a hook to read.
 * The generated `register` calls it once, before the `on()` calls.
 * The hook itself goes to `on()` by its name, because `claude plugin validate --strict` follows `$` only into a function of `register.ts`.
 */
export type Configure = (options: PluginOptions) => void;

/**
 * The eval kinds of one hook, which the generator writes to `evals/hooks.json` under the id `<event> <slice>`.
 * A test is `<file from the repository root> > <test name>`.
 * A hook that runs a model has `requests` above 0 and names its `claude plugin eval` case in `eval`.
 * A hook that can block also names `block` and `false`.
 */
export interface HookEvals {
  readonly requests: number;
  readonly tokens: number;
  readonly blocks: boolean;
  readonly allow: string;
  readonly text: string;
  readonly block?: string;
  readonly false?: string;
  readonly eval?: string;
}

/**
 * One mod handler of a slice. A slice can have more than one for one event, each with its own filter.
 * It has `run`, the hook, and `configure`, when the hook reads the `userConfig` values of the plugin.
 */
export interface ModHandler<E extends EventName = EventName> {
  readonly event: E;
  readonly filter?: EventFilter<E>;
  readonly phase: Phase;
  /**
   * The hook. A hook with a `filter` can take the event that the filter narrows, as `MatchedHook` of the mod API types it.
   * The generated `register.ts` gives the hook and the filter to `on()`, and the compiler checks the pair there.
   */
  readonly run: Handler<E> | ((...args: never[]) => unknown);
  readonly configure?: Configure;
  /**
   * The error handler of the hook: the generated `register.ts` gives it to `.catch()`.
   * A hook that blocks needs it, because a hook that throws or times out is skipped, and the call runs.
   */
  readonly onFail?: Handler<E> | ((...args: never[]) => unknown);
  /** The eval kinds of the hook. One entry covers each handler of the slice on the same event. */
  readonly evals?: HookEvals;
}

/** One classic command hook, for an event that the mod API does not cover. */
export interface ClassicHook {
  readonly event: string;
  readonly matcher?: string;
  readonly command: string;
  readonly timeout?: number;
  readonly async?: boolean;
  /** The eval kinds of the hook. Its id is the event and the command, without the `bun` launcher and the plugin root. */
  readonly evals?: HookEvals;
}

/** One segment of the status line. The `row` is the row of the status line that holds it. */
export interface StatusSegment {
  readonly id: string;
  readonly row: number;
  readonly render: (status: unknown) => string | null;
}

/** One `userConfig` field of a plugin manifest, such as the `backend` of `claudetto-browser`. */
export interface UserConfigOption {
  readonly type: "string" | "number" | "boolean";
  readonly title: string;
  readonly description?: string;
  readonly default: string | number | boolean;
  readonly options?: readonly string[];
}

/**
 * The rungs of the decision ladder (design D2), from the highest to the lowest.
 * `built-in` covers each built-in part of Claude Code: a setting, an env var, a flag,
 * and a plugin part that no hook replaces, such as a skill, an agent, an output style, or a `bin/` command.
 */
export const RUNGS = ["mod", "classic", "built-in", "none"] as const;

/** The ladder line of a slice: its rung, and why no higher rung can do the work. */
export type Ladder = `${(typeof RUNGS)[number]}: ${string}`;

/**
 * One control of a slice (design D27): a hook, a guard, a cap, or a notice.
 * `incident` is the event that the control exists for, and `removeWhen` is the condition that removes it.
 * `incident` is `none recorded` when the repository holds no evidence, and then the control is a candidate for removal.
 */
export interface Control {
  readonly name: string;
  readonly incident: string;
  readonly removeWhen: string;
}

/** The manifest of one slice: the name, and each part that the slice adds to the plugin. */
export interface Slice {
  readonly name: string;
  readonly ladder: Ladder;
  /** The record of each control. `just validate` fails on a slice with a hook and no record. */
  readonly controls?: readonly Control[];
  readonly mod?: readonly ModHandler[];
  readonly hooks?: readonly ClassicHook[];
  readonly cli?: { readonly bin: string };
  readonly segments?: readonly StatusSegment[];
  readonly skills?: readonly string[];
  readonly agents?: readonly string[];
  readonly userConfig?: Readonly<Record<string, UserConfigOption>>;
  readonly settings?: Readonly<Record<string, unknown>>;
}

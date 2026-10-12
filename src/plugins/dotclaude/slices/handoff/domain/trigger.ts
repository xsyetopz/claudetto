// The triggers of a handoff, and the choice of the `mainHandover` value.

import { commands } from "../../../../../kernel/shell.ts";
import { baseName, stripWrappers } from "../../../../../kernel/wrappers.ts";
import {
  DEFAULT_MAIN_HANDOVER,
  MAIN_HANDOVERS,
  type MainHandover,
} from "../limits.ts";

/** The `mainHandover` value of `raw`, or the default when `raw` is not one of the values. */
export const parseHandover = (raw: unknown): MainHandover =>
  MAIN_HANDOVERS.find((mode) => mode === raw) ?? DEFAULT_MAIN_HANDOVER;

/**
 * Whether `command` moves a package to `done` in a command position:
 * `dotclaude-spec lane <package> done` or `dotclaude-spec merge <package> <branch>`.
 * Text in quotes or after `echo` is an argument and not a command.
 */
export const isLaneDone = (command: string): boolean =>
  commands(command).some((argv) => {
    const [head, verb, , last, ...extra] = stripWrappers(argv);
    if (head === undefined || baseName(head) !== "dotclaude-spec") return false;
    if (verb === "lane") return last === "done" && extra.length === 0;
    return verb === "merge" && last !== undefined && extra.length === 0;
  });

/** The call of a tool that `tool.call` gets, as far as the trigger needs it. */
export type LaneCall = {
  readonly tool: string;
  readonly agentId?: string | undefined;
  readonly command?: string | undefined;
};

/** The result of the call: a deny or an error means the lane did not change. */
export type LaneResult = {
  readonly deny?: unknown;
  readonly isError?: boolean | undefined;
};

/** Whether a successful `Bash` call of the main session moved a package to `done`. */
export const laneDoneCall = (e: LaneCall, out: LaneResult): boolean =>
  e.tool === "Bash" &&
  !e.agentId &&
  out.deny === undefined &&
  !out.isError &&
  isLaneDone(e.command ?? "");

/** Whether the context share `percent` reaches the bound `bound`. An absent share does not. */
export const overContext = (
  percent: number | undefined,
  bound: number,
): boolean => percent !== undefined && percent >= bound;

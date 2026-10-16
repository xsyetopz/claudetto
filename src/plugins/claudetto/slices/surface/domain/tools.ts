// The tool descriptions of the `surface` slice: pure rules over the transforms, so the module and the tests share them.
// A transform keeps its tool id, and the rule answers `tool.describe` with no I/O.

import { AGENT } from "../transforms/Agent.ts";
import { BASH } from "../transforms/Bash.ts";
import { LIST_AGENTS } from "../transforms/ListAgents.ts";
import { READ } from "../transforms/Read.ts";

/**
 * One tool transform: the tool id, a shorter description, and whether the tool is deferred.
 * `build` makes the description from the built-in one, when the built-in text has values that Claude Code computes for each run.
 */
export type ToolTransform = {
  readonly id: string;
  readonly description?: string;
  readonly build?: (builtIn: string) => string;
  readonly defer?: boolean;
};

/** The answer of `tool.describe`, as the engine sends it. */
export type ToolAnswer = { description: string; isDeferred?: boolean };

/** Every tool transform of the slice. The filter of `slice.ts` lists the same ids. */
export const TOOL_TRANSFORMS: readonly ToolTransform[] = [
  AGENT,
  BASH,
  READ,
  LIST_AGENTS,
];

/**
 * The `tool.describe` answer for a tool, or `undefined` when no transform changes it.
 * A shorter description replaces the built-in one, and only when it is shorter.
 * A deferral sets `isDeferred: true`, and it never sets `false`.
 */
export const toolAnswer = (
  tool: string,
  answer: ToolAnswer,
): ToolAnswer | undefined => {
  const transform = TOOL_TRANSFORMS.find((t) => t.id === tool);
  if (transform === undefined) return undefined;
  const description =
    transform.build?.(answer.description) ?? transform.description;
  const shorter =
    description !== undefined && description.length < answer.description.length;
  const defer = transform.defer === true;
  if (!(shorter || defer)) return undefined;
  return {
    ...answer,
    description: shorter ? description : answer.description,
    ...(defer ? { isDeferred: true } : {}),
  };
};

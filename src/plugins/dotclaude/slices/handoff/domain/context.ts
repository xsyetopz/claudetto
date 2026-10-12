// The rules of the report-now note: the context and the turns of a subagent, and the text that tells it to report.

import { parseModel } from "../../../../../kernel/model.ts";
import {
  AGENT_MAX_TURNS,
  HAIKU_CONTEXT_MAX,
  REPORT_MAX_WORDS,
  SUBAGENT_CONTEXT_MAX,
  TURNS_LEFT_AT,
} from "../limits.ts";

/** The token counts of one model request. */
export interface Usage {
  readonly input_tokens: number;
  readonly cache_creation_input_tokens: number;
  readonly cache_read_input_tokens: number;
}

/** The context of a request: its input, cache creation, and cache read tokens. */
export const contextTokens = (usage: Usage): number =>
  usage.input_tokens +
  usage.cache_creation_input_tokens +
  usage.cache_read_input_tokens;

/** The context bound in tokens for a subagent on `model`. */
export const boundFor = (model: string | undefined): number => {
  const m = parseModel(model);
  return m?.family === "haiku" && m.major === 5 && m.minor === 5
    ? HAIKU_CONTEXT_MAX
    : SUBAGENT_CONTEXT_MAX;
};

/** The `maxTurns` of the agent type `type` (a `dotclaude:` prefix is allowed), or undefined. */
export const maxTurnsOf = (type: string | undefined): number | undefined => {
  const name = String(type ?? "").replace(/^dotclaude:/, "");
  return Object.hasOwn(AGENT_MAX_TURNS, name)
    ? AGENT_MAX_TURNS[name]
    : undefined;
};

/** The fact for a subagent with `turns` of `maxTurns`, or undefined while more than `TURNS_LEFT_AT` turns are left. */
export const turnFact = (
  turns: number,
  maxTurns: number | undefined,
): string | undefined =>
  !maxTurns || maxTurns - turns > TURNS_LEFT_AT
    ? undefined
    : `You made ${turns} turns, and the limit is ${maxTurns} turns.`;

/** The state of one subagent: the context of its last request, its model, and the count of its turns. */
export interface AgentState {
  readonly tokens: number;
  readonly model: string | undefined;
  readonly turns: number;
}

/** The report-now note for the agent of type `type` in state `state`, or undefined when no bound is reached. */
export const reportNote = (
  state: AgentState,
  type: string | undefined,
): string | undefined => {
  const max = boundFor(state.model);
  const over = state.tokens > max;
  const fact = turnFact(state.turns, maxTurnsOf(type));
  if (!over && !fact) return undefined;
  const facts = [
    over &&
      `Your context is ${state.tokens} tokens, which is over the bound of ${max} tokens.`,
    fact,
    `Commit your work first, then report. A run that reaches its turn limit returns no report. A report of ${REPORT_MAX_WORDS} words or fewer is due now, with what is done and what stays open.`,
  ].filter(Boolean);
  return facts.join(" ");
};

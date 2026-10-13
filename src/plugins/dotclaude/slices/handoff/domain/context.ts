// The rules of the report-now note: the context of a subagent, and the text that tells it to report.

import { parseModel } from "../../../../../kernel/model.ts";
import {
  HAIKU_CONTEXT_MAX,
  REPORT_MAX_WORDS,
  SUBAGENT_CONTEXT_MAX,
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

/** The state of one subagent: the context of its last request and its model. */
export interface AgentState {
  readonly tokens: number;
  readonly model: string | undefined;
}

/** The report-now note for a subagent in state `state`, or undefined while its context is in the bound. */
export const reportNote = (state: AgentState): string | undefined => {
  const max = boundFor(state.model);
  if (state.tokens <= max) return undefined;
  return `Your context is ${state.tokens} tokens, which is over the bound of ${max} tokens. Commit your work first, then report. A report of ${REPORT_MAX_WORDS} words or fewer is due now, with what is done and what stays open.`;
};

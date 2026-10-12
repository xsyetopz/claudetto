// The manifest of the `handoff` slice: the handoff of the main session, and the report-now note for subagents.
// The handoff writes a file, runs `/clear`, and submits a resume prompt (design: workflow, "Handoff").
// It reads and writes no `state.json` and no store.

import type { Slice } from "../../../../kernel/slice.ts";
import {
  keepOptions,
  onSkill,
  onToolCall,
  onTurnComplete,
  onTurnStep,
} from "./adapters/mod.ts";
import { DEFAULT_MAIN_HANDOVER, MAIN_HANDOVERS } from "./limits.ts";

const LAB = "plugins/dotclaude/tests/handoff.test.ts";

export const slice = {
  name: "handoff",
  mod: [
    {
      event: "turn.step",
      evals: {
        requests: 0,
        tokens: 0,
        blocks: false,
        allow: `${LAB} > a step of the main session returns the result of the engine`,
        text: `${LAB} > a step of a subagent returns the result of the engine`,
      },
      // The filter matches each subagent step. The main session has no `agentId`.
      filter: { agentId: /./ },
      phase: "observe",
      run: onTurnStep,
    },
    {
      event: "tool.call",
      evals: {
        requests: 0,
        tokens: 0,
        blocks: false,
        allow: `${LAB} > a step of the main session adds no note to a later call`,
        // The lab cannot mark a `tool.call` as a subagent call, so the note is tested in `tests/dotclaude/handoff/context.test.ts`.
        text: `${LAB} > a package that goes to \`done\` adds the hint`,
      },
      // The filter matches each call, because the mod runtime refuses a `tool.call` handler with no filter.
      filter: { tool: /./ },
      phase: "observe",
      run: onToolCall,
    },
    {
      event: "skill.prompt",
      evals: {
        requests: 0,
        tokens: 0,
        blocks: false,
        allow: `${LAB} > another skill gets no handoff file`,
        text: `${LAB} > the skill \`/handoff\` names the handoff file in its text`,
      },
      filter: { skill: /(?:^|:)handoff$/ },
      phase: "rewrite",
      run: onSkill,
    },
    {
      event: "turn.complete",
      evals: {
        requests: 0,
        tokens: 0,
        blocks: false,
        allow: `${LAB} > below the context bound the turn ends with no handoff`,
        text: `${LAB} > with \`manual\` a context over the bound adds the hint to run \`/handoff\``,
      },
      phase: "observe",
      run: onTurnComplete,
      configure: keepOptions,
    },
  ],
  cli: { bin: "dotclaude-handoff" },
  skills: ["handoff"],
  userConfig: {
    mainHandover: {
      type: "string",
      title: "Main session handover",
      description:
        "Use `auto` to write a handoff file, run `/clear`, and resume when the context is near its bound or a package is done. Use `manual` to get a hint to run `/handoff`. Use `off` for neither.",
      default: DEFAULT_MAIN_HANDOVER,
      options: MAIN_HANDOVERS,
    },
  },
} satisfies Slice;

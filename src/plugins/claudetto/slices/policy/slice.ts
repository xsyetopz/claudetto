// The manifest of the `policy` slice: the AI policy gate for the repositories that are not the user's.
// `session.start` registers the tool `ai_policy`, and `tool.call` denies a contribution to a repository until Claude records a verdict.
// `tool.check` asks the user before each action that reaches a repository with the verdict `silent`.
// A second `tool.call` handler marks each `Bash` call of Claude for the `pre-push` hook, and blanks the GitHub tokens of a script in a closed checkout.
// A repository of the user passes, and so does a folder with no repository or no `origin` remote.
// The `aiPolicy` option turns the gate off.

import type { Handler, Slice } from "../../../../kernel/slice.ts";
import {
  keepOptions,
  onCall,
  onCheck,
  onMark,
  onPolicyTool,
  onSessionStart,
} from "./adapters/mod.ts";
import { OPTION_DESCRIPTION } from "./prompts.ts";

const LAB = "plugins/claudetto/tests/policy.test.ts";
const CONSENT = "plugins/claudetto/tests/consent.test.ts";
const NONE = { requests: 0, tokens: 0 } as const;

export const slice = {
  name: "policy",
  ladder: "mod: the `session.start`, `tool.call`, and `tool.check` hooks",
  mod: [
    {
      event: "session.start",
      evals: {
        ...NONE,
        blocks: false,
        allow: `${LAB} > with the option off, session start registers no tool`,
        text: `${LAB} > session start registers the tool \`ai_policy\``,
      },
      // The filter matches each start, because the mod runtime refuses two `session.start` handlers with no filter.
      filter: { isInteractive: [true, false] },
      phase: "observe",
      run: onSessionStart,
      configure: keepOptions,
    },
    {
      event: "tool.call",
      evals: {
        ...NONE,
        blocks: true,
        allow: `${LAB} > a repository of the user passes`,
        text: `${LAB} > the first push to another repository is denied with the list of its policy files`,
        block: `${LAB} > a forbidden verdict denies a push, a GitHub write, and an MCP write`,
        false: `${LAB} > a read of a forbidden repository stays allowed`,
      },
      filter: { tool: /^(?:Edit|Write|NotebookEdit|Bash|mcp__.+)$/ },
      phase: "check",
      run: onCall,
      configure: keepOptions,
    },
    {
      // It comes after `onCall`, so a call that the gate denies is not marked.
      event: "tool.call",
      filter: { tool: /^Bash$/ },
      phase: "check",
      run: onMark,
      configure: keepOptions,
    },
    {
      event: "tool.check",
      evals: {
        ...NONE,
        blocks: true,
        allow: `${CONSENT} > an allowed verdict lets a push pass with no ask`,
        text: `${CONSENT} > a silent verdict asks the user before each push`,
        block: `${CONSENT} > a silent verdict asks the user before each push`,
        false: `${CONSENT} > an edit never asks, also in a repository with a silent verdict`,
      },
      filter: { tool: /^(?:Edit|Write|NotebookEdit|Bash|mcp__.+)$/ },
      phase: "check",
      run: onCheck,
      configure: keepOptions,
    },
    {
      event: "tool.call",
      filter: { tool: /^mcp__claudetto__ai_policy$/ },
      phase: "answer",
      run: onPolicyTool as unknown as Handler<"tool.call">,
      configure: keepOptions,
    },
  ],
  userConfig: {
    aiPolicy: {
      type: "boolean",
      title: "AI Policy Gate",
      description: OPTION_DESCRIPTION,
      default: true,
    },
  },
} satisfies Slice;

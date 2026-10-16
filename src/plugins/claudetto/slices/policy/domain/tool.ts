// The `ai_policy` tool: its name, its description, and its input schema.
// The description and the schema go to the model, so they follow the strict ASD-STE100 rule.

import {
  TOOL_CONDITIONS,
  TOOL_DESCRIPTION,
  TOOL_QUOTE,
  TOOL_READ,
  TOOL_REPO,
  TOOL_VERDICT,
} from "../prompts.ts";
import { VERDICTS } from "./verdict.ts";

/** The short name of the tool, which the plugin name prefixes. */
export const TOOL = "ai_policy";

/** The full name of the tool, as Claude calls it. */
export const TOOL_FULL = `mcp__claudetto__${TOOL}`;

const INPUT_SCHEMA = {
  type: "object",
  properties: {
    repo: { type: "string", description: TOOL_REPO },
    verdict: { type: "string", enum: [...VERDICTS], description: TOOL_VERDICT },
    quote: { type: "string", description: TOOL_QUOTE },
    conditions: { type: "string", description: TOOL_CONDITIONS },
    read: {
      type: "array",
      items: { type: "string" },
      description: TOOL_READ,
    },
  },
  required: ["repo", "verdict", "read"],
};

/** The argument of `$.tool.register`. */
export const toolSpec = () => ({
  name: TOOL,
  description: TOOL_DESCRIPTION,
  inputSchema: INPUT_SCHEMA,
  isDeferred: false,
});

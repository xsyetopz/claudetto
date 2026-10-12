// The `second_opinion` tool: its name, its description, and its input schema.
// The description and the schema go to the model, so they follow the strict ASD-STE100 rule.

import { MAX_OPTIONS, MIN_OPTIONS } from "../limits.ts";

/** The short name of the tool, which the plugin name prefixes. */
export const TOOL = "second_opinion";

/** The full name of the tool for the model, for the plugin `dotclaude`. */
export const TOOL_NAME = `mcp__dotclaude__${TOOL}`;

const DESCRIPTION = `Asks Jev, a decision model, for a second opinion on a choice that facts can settle.
Use it for a close call or a technical choice, and when the user asks for a second opinion.
Do not use it for goals, preferences, or approvals, because only the user decides those.
Jev returns a pick and a confidence from 0 to 1.
The question, the options, and the state go to the TypeSafe API, so put no secret and no personal data in them.
Keep the question neutral, because a leading question gets the answer that it leads to.
Give each option with one fact for it and one fact against it.
Leave out the lean of the user, the notes, or the team, because Jev judges the facts only.
The tool puts the options in a random order.
When Jev gives no answer, the tool uses a small Claude model, and it says so in its result.
When you do not follow the pick, tell the user and give the reason.`;

const INPUT_SCHEMA = {
  type: "object",
  properties: {
    question: {
      type: "string",
      description: "The decision to check, as a neutral question.",
    },
    options: {
      type: "array",
      description: "Every option. Leave it out for a yes or no question.",
      minItems: MIN_OPTIONS,
      maxItems: MAX_OPTIONS,
      items: {
        type: "object",
        properties: {
          key: {
            type: "string",
            description: "A short name of the option.",
          },
          description: {
            type: "string",
            description:
              "What the option is, with the evidence for and against it.",
          },
        },
        required: ["key"],
      },
    },
    state: {
      type: "string",
      description:
        "The facts that the decision depends on, such as a diff, a log, or a plan.",
    },
  },
  required: ["question"],
};

/** The argument of `$.tool.register`. The tool is registered at each session start, with or without a key. */
export const toolSpec = () => ({
  name: TOOL,
  description: DESCRIPTION,
  inputSchema: INPUT_SCHEMA,
  isDeferred: false,
});

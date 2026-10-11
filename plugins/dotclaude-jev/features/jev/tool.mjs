// The second-opinion tool of Jev.
// The hooks module registers it with `$.tool.register`, and a `tool.call` hook serves it.
// With `TYPESAFE_API_KEY`, the hooks module registers the tool, and it asks Jev.
// Without the key, the hooks module registers no tool, so the tool costs no tokens.
// This file holds the pure parts. The `$` calls are in the hooks module.

import { MAX_OPTIONS, MIN_OPTIONS } from "./limits.mjs";

export const TOOL = "second_opinion";

const DESCRIPTION = `Asks Jev, a decision model, for a second opinion on a choice that facts can settle.
Use it for a close call or a technical choice, and when the user asks for a second opinion.
Do not use it for goals, preferences, or approvals, because only the user decides those.
Jev returns a pick and a confidence from 0 to 1.
The question, the options, and the state go to the TypeSafe API, so put no secret and no personal data in them.
Keep the question neutral, because a leading question gets the answer that it leads to.
Give each option with one fact for it and one fact against it.
Leave out the lean of the user, the notes, or the team, because Jev judges the facts only.
The tool puts the options in a random order.
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

/** The argument of `$.tool.register`. The hooks module calls it only when the key is set. */
export const toolSpec = () => ({
  name: TOOL,
  description: DESCRIPTION,
  inputSchema: INPUT_SCHEMA,
  isDeferred: false,
});

/** The name of the tool for the model. */
export const fullName = (plugin) => `mcp__${plugin}__${TOOL}`;

/** A copy of the items in a random order (Fisher-Yates). */
export function shuffled(items, random = Math.random) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * The client run for the input, or `{ error }` with the one fault of an input that is not valid.
 * The state goes on stdin (`--state -`), and `--` ends the flags before the words of the model.
 */
export function clientArgs(input, random = Math.random) {
  const { question, options, state } = input ?? {};
  if (typeof question !== "string" || !question.trim())
    return {
      error: "The `question` is empty. Give a `question` that has text.",
    };
  const head = typeof state === "string" ? ["--state", "-", "--"] : ["--"];
  const stdin = typeof state === "string" ? state : undefined;
  if (options === undefined) return { args: ["yes", ...head, question], stdin };
  if (!Array.isArray(options) || options.length < MIN_OPTIONS)
    return { error: `A pick needs ${MIN_OPTIONS} or more \`options\`.` };
  if (
    !options.every(
      (o) => typeof o?.key === "string" && o.key && !o.key.includes("="),
    )
  )
    return {
      error:
        "An option `key` is empty or has an `=` character. Give each option a `key` with text and no `=`.",
    };
  const items = shuffled(options, random).map(
    (o) => `${o.key}=${o.description ?? ""}`,
  );
  return { args: ["pick", ...head, question, ...items], stdin };
}

/** The result without a pick of Jev: it names the reason, and tells Claude to tell the user. */
export function fallback(reason) {
  return [
    `Jev gave no answer. ${reason}`,
    "Another call for this question is unlikely to help.",
    "Answer from your own check of the evidence, and tell the user that no second opinion was available.",
  ].join("\n");
}

/** The text result for the outcome of a client run (see `outcome` in `run.mjs`). */
export function result(run) {
  if (!run.ok) return fallback(`Jev failed: ${run.reason}`);
  return `Jev answered:\n${run.stdout}`;
}

// A call can reach this only if the key left the environment after the tool was registered.
export const NO_KEY = fallback(
  "The user must set `TYPESAFE_API_KEY` before Claude Code starts.",
);

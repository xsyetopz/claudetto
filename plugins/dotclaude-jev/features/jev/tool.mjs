// The second-opinion tool of Jev.
// The hooks module registers it with `$.tool.register`, and a `tool.call` hook serves it.
// With `TYPESAFE_API_KEY`, the tool is loaded and asks Jev.
// Without the key, the tool is deferred, and a call gets the fallback result.
// This file holds the pure parts. The `$` calls are in the hooks module.

export const TOOL = "second_opinion";

const RULES = `Facts decide some questions, and the user decides others.
Ask the user, and not this tool, about goals, preferences, and approvals, because Jev does not answer for the user.
When Jev picks an answer with a confidence of 0.9 or more for a question that facts decide, do not ask the user that question unless the user asks for it.
When you do not follow the pick of Jev, say so and give the reason.

Keep the question neutral.
Give the decision, every option, and for each option at least one fact for it and one fact against it.
Give no preferred answer and no leading words.
Leave out a lean or a preference of the user, the notes, or the team, because Jev judges the facts only.
The tool puts the options in a random order before it asks Jev.`;

const DESCRIPTION_LOADED = `Asks Jev, a decision model, for a second opinion before you act on a decision.
Ask about a close call, a technical choice, a decision or an answer of the user, and each request for a second opinion.
Jev gives the pick and its confidence from 0 to 1.
A confidence under 0.5 is a weak signal.
The question goes to the TypeSafe API, so put no secret and no personal data in it.

${RULES}`;

const DESCRIPTION_DEFERRED = `Asks for a second opinion on a decision that is hard to undo, such as a data migration, a public API change, or a security setting.
Do not use it for a decision that you can undo with one edit.
Jev is off, so a call gets a reviewer check and not a pick of Jev.

${RULES}`;

const INPUT_SCHEMA = {
  type: "object",
  properties: {
    question: {
      type: "string",
      description:
        "The decision to check, as a neutral question with no preferred answer.",
    },
    options: {
      type: "array",
      description:
        "Every option. Leave it out for a yes or no question. The tool orders the options at random.",
      minItems: 2,
      maxItems: 255,
      items: {
        type: "object",
        properties: {
          key: {
            type: "string",
            description: "A short name of the option, with no `=` character.",
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

/** The argument of `$.tool.register`: loaded with the key, deferred without it. */
export function toolSpec(hasKey) {
  return {
    name: TOOL,
    description: hasKey ? DESCRIPTION_LOADED : DESCRIPTION_DEFERRED,
    inputSchema: INPUT_SCHEMA,
    isDeferred: !hasKey,
  };
}

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
 * The client run for the input, or `null` when the input is not valid.
 * The state goes on stdin (`--state -`), and `--` ends the flags before the words of the model.
 */
export function clientArgs(input, random = Math.random) {
  const { question, options, state } = input ?? {};
  if (typeof question !== "string" || !question.trim()) return null;
  const head = typeof state === "string" ? ["--state", "-", "--"] : ["--"];
  const stdin = typeof state === "string" ? state : undefined;
  if (options === undefined) return { args: ["yes", ...head, question], stdin };
  const valid =
    Array.isArray(options) &&
    options.length >= 2 &&
    options.every(
      (o) => typeof o?.key === "string" && o.key && !o.key.includes("="),
    );
  if (!valid) return null;
  const items = shuffled(options, random).map(
    (o) => `${o.key}=${o.description ?? ""}`,
  );
  return { args: ["pick", ...head, question, ...items], stdin };
}

/** The result without a pick of Jev: it names the reason and the route once. */
export function fallback(reason) {
  return [
    `Jev gave no answer. ${reason}`,
    "Route: no check ran in this tool, and no model answered.",
    "Start the `reviewer` agent of `dotclaude` when it is installed, and ask it the same neutral question.",
    "Else answer from your own check of the evidence.",
    "Do not call this tool again for this question.",
  ].join("\n");
}

/** The text result for the outcome of a client run (see `outcome` in `run.mjs`). */
export function result(run) {
  if (!run.ok) return fallback(`Jev failed: ${run.reason}`);
  return `Route: Jev (its own models).\n${run.stdout}`;
}

export const INVALID_INPUT =
  "The input is not valid. Give `question` and, for a pick, 2 or more `options`, each with a `key` that has no `=` character.";

export const NO_KEY = fallback("`TYPESAFE_API_KEY` is not set.");

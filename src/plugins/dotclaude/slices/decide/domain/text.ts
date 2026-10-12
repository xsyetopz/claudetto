// The texts that go to Claude: the cause of no Jev answer, the result of the tool, and the prompt of the fallback model.
// Each text follows the strict ASD-STE100 rule, and each sentence gives a reason or a step.

import type { Cause, DecisionRequest } from "../ports.ts";
import type { Route } from "./route.ts";

/** The sentence that names the cause of no Jev answer. */
export const causeText = (cause: Cause): string => {
  switch (cause) {
    case "no-key":
      return "The variable `TYPESAFE_API_KEY` is not set, so Jev was not tried.";
    case "invalid-key":
      return "The key in `TYPESAFE_API_KEY` is not valid.";
    case "no-balance":
      return "The TypeSafe account has no balance.";
    case "usage":
      return "The request to Jev was not valid.";
    case "failed":
      return "The call to Jev failed.";
    case "model-failed":
      return "The fallback model gave no answer.";
  }
};

/** The result of the tool for a route. Each text names the source of the answer. */
export const resultText = (route: Route): string => {
  switch (route.source) {
    case "jev":
      return `Jev answered:\n${route.text}`;
    case "fallback":
      return [
        `Jev gave no answer. ${causeText(route.cause)}`,
        "A small Claude model answered instead. That answer is not from Jev.",
        "Tell the user that the answer is from a Claude model, and give the reason.",
        route.text,
      ].join("\n");
    case "none":
      return [
        `Jev gave no answer. ${causeText(route.cause)}`,
        "The fallback model gave no answer either.",
        "Answer from your own check of the evidence, and tell the user that no second opinion was available.",
      ].join("\n");
  }
};

/** The system prompt and the user prompt of the fallback completion. */
export const fallbackPrompt = (
  request: DecisionRequest,
): { system: string; prompt: string } => {
  const system = [
    "You answer one decision question for a coding agent.",
    "Use only the facts in the state, and do not add facts.",
    "Reply with one JSON object and no other text.",
    "The object has the fields `choice`, `confidence`, and `reason`.",
    "For a yes or no question, `choice` is `yes` or `no`.",
    "For a question with options, `choice` is the key of your pick.",
    "`confidence` is a number from 0 to 1, the probability that your choice is right.",
    "`reason` is one sentence with the reason.",
  ].join("\n");
  const options = (request.options ?? []).map(
    (o) => `- ${o.key}: ${o.description ?? ""}`,
  );
  const parts = [
    `Question: ${request.question}`,
    ...(options.length > 0
      ? ["Options:", ...options]
      : ["Question type: yes or no."]),
    ...(request.state === undefined ? [] : ["State:", request.state]),
  ];
  return { system, prompt: parts.join("\n") };
};

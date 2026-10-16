// The text of a check: the pending action, and the prompts of the two model paths.
// This file has no `node:` import and no use of `Bun`, because Claude Code runs it in the mod runtime.
// The prompts are the own words of this package, and they copy no text of the built-in `cc-plugin-you-should-know`.

import { MAX_INPUT_CHARS, MAX_SEEN_TOPICS } from "../limits.ts";
import {
  COMPLETE_PROMPT,
  FORK_PROMPT,
  RULES,
  SYSTEM_PROMPT,
} from "../prompts.ts";
import { inputOf } from "./reads.ts";

/** A topic that showed in the session: the id that the model gave, and the sentence. */
export type Shown = { id: string; topic: string };

/** `text` cut to `max` characters, with a mark where it was cut. */
export const clip = (text: string, max: number): string =>
  text.length <= max ? text : `${text.slice(0, max)} [cut]`;

/** `text` with each closing tag of a prompt part broken, so that data cannot end its own part. */
const data = (text: string): string =>
  text.replace(/<\/(request|action|seen)>/gi, "<\\/$1>");

/** The pending action as text: the tool and its arguments, cut to the input bound. */
export const actionOf = (tool: string, input: unknown): string =>
  clip(
    `Tool: ${tool}\n${JSON.stringify(inputOf(input), null, 1)}`,
    MAX_INPUT_CHARS,
  );

/** The system prompt of the separate call. */
export const SYSTEM = SYSTEM_PROMPT({ rules: RULES });

/** The newest topics that the user saw, as prompt text. The older ones are not sent. */
const shownText = (shown: readonly Shown[]): string => {
  const newest = shown.slice(-MAX_SEEN_TOPICS);
  return newest.length === 0
    ? "none"
    : newest.map((s) => `- ${data(s.id)}: ${data(s.topic)}`).join("\n");
};

/** The prompt of the separate call: the request of the user, the pending action, and the topics that the user saw. It has no transcript. */
export const completePrompt = (
  request: string,
  action: string,
  shown: readonly Shown[],
): string =>
  COMPLETE_PROMPT({
    request: data(clip(request, MAX_INPUT_CHARS)),
    action: data(action),
    seen: shownText(shown),
  });

/** The prompt of a fork. The fork reads the conversation up to the last request, so the prompt gives only the pending action. */
export const forkPrompt = (action: string, shown: readonly Shown[]): string =>
  FORK_PROMPT({
    rules: RULES,
    action: data(action),
    seen: shownText(shown),
  });

/** True when a topic with `id` showed in the session already. The ids are ASCII slugs, so the compare is exact and does not depend on language or case rules. */
export const isRepeat = (id: string, shown: readonly Shown[]): boolean =>
  shown.some((old) => old.id === id);

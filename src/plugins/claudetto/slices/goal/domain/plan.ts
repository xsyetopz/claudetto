// How the text of `/goal` becomes steps with checks.

import type { Check, Step } from "./state.ts";

/** The spans, the separators, and the words that only say a command succeeds. */
const SPAN_FILLER =
  /`[^`]+`|\b(?:and|both|all|each|with|exits?|returns?|pass(?:es)?|succeed(?:s)?|status|code|zero|0|green)\b|[,;.\s]/g;

/**
 * The checks of a text, from a condition or from a `Check:` line.
 * The project puts each code item in backticks, so a span is not always a command.
 * - Only spans with separators (`,` `;` `and`, space, a final `.`) and the words that say a command succeeds
 *   (`both`, `all`, `each`, `exit 0`, `passes`, `succeeds`, `green`): each span is a `run` check.
 *   A `judge` check of "`cmd` exits 0" adds nothing, and it fails when the model could not run the command.
 * - Else a span at the start is a `run` check, with one `judge` check of the whole text.
 * - Else one `judge` check.
 */
export const checksOf = (text: string): Check[] => {
  const t = text.trim();
  const run = (command = ""): Check => ({ kind: "run", command });
  const spans = [...t.matchAll(/`([^`]+)`/g)].map(([, command]) => command);
  if (spans.length && !t.replace(SPAN_FILLER, "")) {
    return spans.map(run);
  }
  const first = /^`([^`]+)`/.exec(t)?.[1];
  const judge: Check = { kind: "judge", claim: t };
  return first ? [run(first), judge] : [judge];
};

/** The steps of a condition: one step, with the checks of `checksOf`. */
export const conditionSteps = (condition: string): Step[] => [
  { title: condition, checks: checksOf(condition) },
];

/**
 * The steps of a plan file.
 * A heading of level 2 or 3 that starts with a number, such as `## 8b. Rewrite`, is a step.
 * Each `Check:` line below it, with an optional `- `, gives the checks of `checksOf`.
 */
export const planSteps = (text: string): Step[] => {
  const steps: { title: string; checks: Check[] }[] = [];
  for (const line of text.split("\n")) {
    const title = /^#{2,3} \d+\w*\. (.+)/.exec(line)?.[1];
    if (title) steps.push({ title, checks: [] });
    const check = /^\s*(?:- )?Check: (.+)/.exec(line)?.[1];
    if (check) steps.at(-1)?.checks.push(...checksOf(check));
  }
  return steps;
};

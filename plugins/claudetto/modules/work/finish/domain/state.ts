// The state of a goal (`.claudetto/goal.json`): the one check command that the `Stop` hook runs.

import { parseJson } from "../../../../kernel/text.ts";

export type Goal = { readonly check: string };

/** Whether `text` starts with a slash command such as `/claudetto:apply`, which `sh -c` cannot run. A path such as `/usr/bin/true` has a second `/`. */
export const isSlashCommand = (text: string): boolean =>
  /^\/[\w.-]+(:[\w.-]+)?(\s|$)/.test(text.trim());

/** The goal in `text`, or `null` for no goal (`null`, an empty file, text that is not a goal, or a slash command). */
export const parseGoal = (text: string): Goal | null => {
  const goal = parseJson(text) as Goal | null;
  return goal &&
    typeof goal.check === "string" &&
    goal.check &&
    !isSlashCommand(goal.check)
    ? goal
    : null;
};

/** The check command in the text after `/goal`: the text with one pair of backticks cut. */
export const checkOf = (args: string): string =>
  args.trim().replace(/^`([^`]+)`$/, "$1");

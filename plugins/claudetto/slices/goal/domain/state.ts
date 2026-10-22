// The state of a goal (`.claudetto/goal.json`): the one check command that the `Stop` hook runs.

export type Goal = { readonly check: string };

/** The goal in `text`, or `null` for no goal (`null`, an empty file, or text that is not a goal). */
export const parseGoal = (text: string): Goal | null => {
  try {
    const goal = JSON.parse(text) as Goal | null;
    return goal && typeof goal.check === "string" && goal.check ? goal : null;
  } catch {
    return null;
  }
};

/** The check command in the text after `/goal`: the text with one pair of backticks cut. */
export const checkOf = (args: string): string =>
  args.trim().replace(/^`([^`]+)`$/, "$1");

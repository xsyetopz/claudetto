/** `hooks/register.ts` with no `/goal` command and no stop of `finish`, so the built-in `/goal` runs and the other hooks stay (arm `goal-builtin`). */
export const withoutGoal = (text: string): string =>
  text
    .replace(
      / *\/\/ eval: (classic\.Stop|command\.run) finish\n *on\([^;]*\);\n/g,
      "",
    )
    .replace('"goal_status", ', "");

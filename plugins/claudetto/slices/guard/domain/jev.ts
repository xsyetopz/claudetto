// The question to Jev for an `ask` of the delete and local `git` gates (spec `permission-gate`, "Jev before a Person").
// The command and the reasons go as text, and no file.
// Jev allows the call only on a confident yes, and each other answer, a failure, or a timeout leaves the `ask` to a person.

import { JEV_YES_MIN } from "../limits.ts";
import { JEV_QUESTION, JEV_STATE } from "../prompts.ts";

/** The arguments of `claudetto-decide` for the `ask` with `reason` of the `Bash` command `command`. */
export const jevArgs = (command: string, reason: string): string[] => [
  "yes",
  "--json",
  "--state",
  JEV_STATE({ command, reasons: reason }),
  "--",
  JEV_QUESTION,
];

/** `P(yes)` from the `--json` output of `claudetto-decide yes` when it is at least `JEV_YES_MIN`, else `undefined`. */
export const sureYes = (stdout: string): number | undefined => {
  try {
    const { answer } = JSON.parse(stdout) as {
      answer?: { choice?: unknown; confidence?: unknown };
    };
    const { choice, confidence } = answer ?? {};
    if (typeof confidence !== "number" || !(confidence >= 0 && confidence <= 1))
      return undefined;
    const p = choice === "yes" ? confidence : 1 - confidence;
    return choice === "yes" && p >= JEV_YES_MIN ? p : undefined;
  } catch {
    return undefined;
  }
};

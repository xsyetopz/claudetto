// The question to Jev for an `ask` of the delete and local `git` gates: only a confident yes allows the call.

import { jevBody, noulOf } from "../../../kernel/jev.ts";
import { JEV_YES_MIN } from "../limits.ts";
import { JEV_QUESTION, JEV_STATE } from "../prompts.ts";

/** The request body for the `ask` with `reason` of the `Bash` command `command`: one yes or no question, `q`. */
export const jevRequest = (command: string, reason: string) =>
  jevBody(JEV_STATE({ command, reasons: reason }), {
    q: { type: "noul", instructions: JEV_QUESTION },
  });

/** `P(yes)` of the `answers` of the API when it is at least `JEV_YES_MIN`, else `undefined`. */
export const sureYes = (answers: unknown): number | undefined => {
  const p = noulOf(answers, "q");
  return p !== undefined && p >= JEV_YES_MIN ? p : undefined;
};

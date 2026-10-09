// The text of the level notes of design D32 (spec usage-awareness).
// The handoff steps are here and not in the output style, so that a session that reaches no level does not pay for them.

import { CONTEXT_WINDOW } from "../../lib/budget.mjs";
import {
  CONTEXT_BLOCK_MARGIN,
  CONTEXT_HANDOFF_AT,
  CONTEXT_NOTICE_AT,
  HANDOFF_RESERVE,
} from "./limits.mjs";

const NAMES = { five_hour: "5-hour", seven_day: "7-day" };

/** A time in seconds as `2026-10-09T14:30Z`. */
export const utc = (s) => `${new Date(s * 1000).toISOString().slice(0, 16)}Z`;

/** The steps of a handoff, without their first line. */
const STEP_LIST = [
  "1. Finish the current edit, and do not start a new edit.",
  "2. Make sure that each file has no incomplete edit.",
  "3. In `tasks.md` of the OpenSpec change, mark each task whose check passed in this session.",
  "4. Under the first task that is not marked, add a `Status <date>:` note. Do not put it under a marked task. In the note, write the checks that run or fail and the IDs of the background tasks. Also write the partial work and the next step.",
  "5. Put the decisions of the chat in `design.md` of the change.",
  "6. In the last message, write the command that continues the work, such as `/opsx:apply <change>`.",
  "When the project has no OpenSpec change, write the same data in the last message.",
];

/** The steps of a handoff, which end the turn. */
export const HANDOFF_STEPS = [
  "Do these steps, and then end the turn:",
  ...STEP_LIST,
].join("\n");

/**
 * The same steps in a notice, for a stop before the handoff note (eval run 2026-10-09:
 * the model stopped at the notice and wrote no status note).
 */
export const NOTICE_STEPS = [
  "When you stop the work before the handoff note, do these steps first:",
  ...STEP_LIST,
].join("\n");

function contextText(l, off) {
  const head = `The context of this session is ${l.tokens} tokens, which is ${Math.round(l.share)}% of ${CONTEXT_WINDOW}. ${off ? "Compaction is off, so the session stops before the context is full and gives you no last turn." : "Compaction runs before the context is full, and it can lose detail."}`;
  const block = CONTEXT_WINDOW - CONTEXT_BLOCK_MARGIN;
  const rest = Math.max(0, block - l.tokens);
  const room = Math.max(0, rest - HANDOFF_RESERVE);
  return l.step === "notice"
    ? [
        head,
        `The context limit of the client is ${block} tokens, which is ${rest} tokens from now.`,
        `The handoff note comes at ${CONTEXT_HANDOFF_AT}% with the steps, but one large tool result can go past that level directly to the limit.`,
        `The handoff steps need ${HANDOFF_RESERVE} tokens, so ${room} tokens are now free for work.`,
        "Before each slice, estimate its tokens. A full read of a large file can use 40K tokens.",
        "Start the slice only when it fits in the free tokens that are left. Else stop the work, and do the steps below.",
        "When you stop before the handoff note, tell the user in the last message to run `/clear`, and then the command that continues the work.",
      ].join(" ")
    : `${head} Stop the work now, and do the handoff steps.`;
}

function usageText(l, now) {
  const name = NAMES[l.kind] ?? l.kind;
  const runOut =
    Number.isFinite(l.run_out_at) && l.run_out_at > now
      ? ` At the current rate, it is at 100% at ${utc(l.run_out_at)}.`
      : "";
  const head = `The ${name} usage limit of the account is at ${Math.round(l.used_percentage)}%, and it resets at ${utc(l.resets_at)}.${runOut} At 100%, the session stops and gives you no last turn.`;
  return l.step === "notice"
    ? `${head} Use smaller slices of work, so that each slice can end before that stop.`
    : `${head} Stop the work now, and do the handoff steps.`;
}

/**
 * The note for the new levels `levels` (from `newLevels`), or `undefined` when there is none.
 * `share` is the context share of the session in percent, `off` is true when compaction is off, and `now` is in seconds.
 */
export function noteText(levels, { share = 0, off = false, now = 0 } = {}) {
  if (!levels.length) return undefined;
  const parts = levels.map((l) =>
    l.kind === "context" ? contextText(l, off) : usageText(l, now),
  );
  const handoffs = levels.filter((l) => l.step === "handoff");
  if (!handoffs.length) return [...parts, NOTICE_STEPS].join("\n");
  parts.push(HANDOFF_STEPS);
  if (handoffs.some((l) => l.kind === "context"))
    parts.push(
      "In the last message, tell the user to run `/clear`, and then the command that continues the work.",
    );
  for (const l of handoffs.filter((h) => h.kind !== "context"))
    parts.push(
      `In the last message, write that the limit resets at ${utc(l.resets_at)}. ${share >= CONTEXT_NOTICE_AT ? "This session is large. Tell the user to run `/clear` after the reset, and then the command that continues the work." : "Tell the user to continue in this session after the reset."}`,
    );
  return parts.join("\n");
}

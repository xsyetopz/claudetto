import { GOAL_CHARS_MAX, REASON_CHARS_MAX } from "./goal.ts";
import { LOOP_BLOCKS_MAX } from "./loop.ts";

export const LOOP = (v: { id: string; task: string }): string =>
	`The applied change's \`tasks.md\` has an open task. The next one is ${v.id}: ${v.task}
Continue with task ${v.id}. If a blocker stops it, mark the task \`blocked: <reason>\` and continue with the next one. If only the user can decide, ask with \`AskUserQuestion\`.`;

export const LOOP_CAP = (v: { id: string }): string =>
	`claudetto loop: ${LOOP_BLOCKS_MAX} stops in a row were blocked with no file change, so this stop goes through. Task ${v.id} is still open.`;

export const GOAL_TOOL = "goal";

export const GOAL_CALL = "mcp__claudetto__goal";

export const START = (v: { check: string }): string =>
	`The goal is set: \`${v.check}\` must exit 0. Work until it does. A stop is blocked while it fails. If the same blocker stops the work for three goal turns in a row and only the user or an outside change can clear it, stop the goal with \`${GOAL_CALL}\` and status \`blocked\`. If the user asks to pause, use status \`paused\`. After ${LOOP_BLOCKS_MAX} blocked stops in a row with no file change, the goal is marked blocked.`;

export const RETRY = (v: { check: string; output: string }): string =>
	`The goal check \`${v.check}\` fails. Fix the cause, then end the turn. If the same blocker has held for three goal turns in a row and only the user can clear it, stop the goal with \`${GOAL_CALL}\` and status \`blocked\`, say why, and end the turn.
${v.output}`;

export const GOAL_CAP = (v: { check: string }): string =>
	`claudetto goal: \`${v.check}\` still fails after ${LOOP_BLOCKS_MAX} blocked stops with no file change, so the goal is marked blocked and this stop goes through. \`/goal resume\` turns it back on.`;

/** The reason the bound gives when it marks the goal blocked. */
export const NO_PROGRESS = `${LOOP_BLOCKS_MAX} blocked stops with no file change`;

export const GOAL_STOPPED = (v: {
	check: string;
	status: "paused" | "blocked";
	reason: string;
}): string =>
	`Goal ${v.status}: \`${v.check}\`. Reason: ${v.reason}
\`/goal resume\` turns it back on, and \`/goal clear\` drops it.`;

export const GOAL_RESUMED = (v: { check: string }): string =>
	`Goal resumed: \`${v.check}\` must exit 0.`;

export const GOAL_NONE = "No goal set, so there is nothing to stop.";

export const GOAL_BAD_INPUT =
	"The goal is unchanged. Send `status` as `paused` or `blocked`, and a `reason` that is not blank.";

export const TOOL_GOAL =
	"Stops the active `/goal` check, so a failing check no longer blocks a stop. Use `blocked` only when the same blocker has held for three goal turns in a row and only the user or an outside change can clear it, never because the work is hard or slow. Use `paused` only when the user asks to pause. The user turns it back on with `/goal resume`.";

/** The goal tool's input: the stop status and the reason the user reads. */
export const GOAL_INPUT_SCHEMA: Record<string, unknown> = {
	type: "object",
	properties: {
		status: { type: "string", enum: ["paused", "blocked"] },
		reason: {
			type: "string",
			maxLength: REASON_CHARS_MAX,
			description:
				"The blocker, or the user's request to pause, in one sentence for the user.",
		},
	},
	required: ["status", "reason"],
	additionalProperties: false,
};

export const GOAL_SET = (v: { check: string }): string =>
	`Goal set: \`${v.check}\` must exit 0.`;

export const GOAL_STATUS = (v: { check: string | null }): string =>
	v.check === null
		? "No goal set. Usage: `/goal <shell command>`"
		: `Goal: \`${v.check}\` must exit 0.`;

export const GOAL_CLEARED = (v: { check: string | null }): string =>
	v.check === null ? "No goal set." : `Goal cleared: \`${v.check}\``;

export const GOAL_SLASH = (v: { check: string }): string =>
	`No goal set. \`${v.check}\` is a slash command. A goal is a shell command that exits 0, such as \`/goal just check\`.`;

export const GOAL_LONG = (v: { length: number }): string =>
	`No goal set. A goal command is limited to ${GOAL_CHARS_MAX} characters (got ${v.length}). Put a long check in a script and pass its path.`;

export const GOAL_DESCRIPTION =
	"Set a shell command that must exit 0 before Claude stops";

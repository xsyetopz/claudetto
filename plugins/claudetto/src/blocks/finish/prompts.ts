import { GOAL_CHARS_MAX } from "./goal.ts";
import { LOOP_BLOCKS_MAX } from "./loop.ts";

export const LOOP = (v: { id: string; task: string }): string =>
	`The applied change's \`tasks.md\` has an open task. The next one is ${v.id}: ${v.task}
Continue with task ${v.id}. If a blocker stops it, mark the task \`blocked: <reason>\` and continue with the next one. If only the user can decide, ask with \`AskUserQuestion\`.`;

export const LOOP_CAP = (v: { id: string }): string =>
	`claudetto loop: ${LOOP_BLOCKS_MAX} stops in a row were blocked with no file change, so this stop goes through. Task ${v.id} is still open.`;

export const START = (v: { check: string }): string =>
	`The goal is set: \`${v.check}\` must exit 0. Work until it does. A stop is blocked while it fails, and goes through after ${LOOP_BLOCKS_MAX} blocks in a row with no file change, so a step that only the user can take ends the loop.`;

export const RETRY = (v: { check: string; output: string }): string =>
	`The goal check \`${v.check}\` fails. Fix the cause, then end the turn. If only the user can take the next step, say so and end the turn.
${v.output}`;

export const GOAL_CAP = (v: { check: string }): string =>
	`claudetto goal: \`${v.check}\` still fails after ${LOOP_BLOCKS_MAX} blocked stops with no file change, so the goal is cleared and this stop goes through.`;

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

import { LOOP_BLOCKS_MAX } from "./loop.ts";

export const LOOP = (v: { id: string; task: string }): string =>
	`The applied change's \`tasks.md\` has an open task. The next one is ${v.id}: ${v.task}
Continue with task ${v.id}. If a blocker stops it, mark the task \`blocked: <reason>\` and continue with the next one. If only the user can decide, ask with \`AskUserQuestion\`.`;

export const LOOP_CAP = (v: { id: string }): string =>
	`claudetto loop: ${LOOP_BLOCKS_MAX} stops in a row were blocked with no file change, so this stop goes through. Task ${v.id} is still open.`;

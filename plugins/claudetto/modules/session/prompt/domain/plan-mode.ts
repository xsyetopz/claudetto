// With `CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS` set (design D21), the built-in agents are off, so the plan mode text names `claudetto:Artemis` in place of `Explore` and `Plan`.
// `planModeText` replaces the plan mode attachment of 2.1.309 (`prompts/mode-plan.md`) with a shorter text (design D7, C2).

import { PLAN_MODE } from "../prompts.ts";

/** The agent that plan mode names for a search over many files. */
export const SCOUT_AGENT = "claudetto:Artemis";

/** The attachment kinds that `prompt.attachment` rewrites, and does not leave out. */
export const REWRITTEN_ATTACHMENTS = ["plan_mode"] as const;

/** The plan file path between the phrases of the 2.1.309 engine text (`chunk-kang00hq.js`, offset 5085584), which can hold spaces. */
const PLAN_FILE =
	/(?:already exists at|create your plan at) (.+?)(?:\. You can| using )/;

const PLAN_FILE_EXISTS = /plan file already exists/;

/** The plan mode text for the engine text `text`, or `text` when ours is not shorter, such as a short reminder of a plan mode that is already active. */
export const planModeText = (text: string): string => {
	const file = PLAN_FILE.exec(text)?.[1] ?? "the plan file";
	const ours = PLAN_MODE({
		file,
		exists: PLAN_FILE_EXISTS.test(text),
		scout: SCOUT_AGENT,
	});
	return ours.length < text.length ? ours : text;
};

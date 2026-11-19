/** Rules for when to look again, and who is typing. */

import type { EngineInterface } from "claude-code";

import { LOOKS_TO_SKIP_MAX } from "../shared/constants";

/** Looks to skip after `n` notes in a row went unanswered: 0 for two, then 1, 2, 4 ... capped. */
export const looksToSkipAfter = (n: number): number =>
	n <= 2 ? 0 : Math.min(LOOKS_TO_SKIP_MAX, 2 ** (n - 3));

const ON_WORDS = ["1", "true", "yes", "on"];

export const switchOf = (value: Promise<string | undefined>): Promise<boolean> =>
	value.then(
		(v) => v !== undefined && ON_WORDS.includes(v.trim().toLowerCase()),
		() => false,
	);

/** True when a program rather than a person may be driving the session. */
export async function mayBeDriven($: EngineInterface): Promise<boolean> {
	const [kind, job, child, claudecode, skipHistory] = await Promise.all([
		$.env.get("CLAUDE_CODE_SESSION_KIND"),
		$.env.get("CLAUDE_JOB_DIR"),
		$.env.get("CLAUDE_CODE_CHILD_SESSION"),
		$.env.get("CLAUDECODE"),
		$.env.get("CLAUDE_CODE_SKIP_PROMPT_HISTORY"),
	]);
	return (
		kind !== undefined ||
		job !== undefined ||
		child !== undefined ||
		(claudecode !== undefined && skipHistory !== undefined)
	);
}

export const isPersonsPrompt = (kind: string): boolean => kind === "composer" || kind === "bridge";

export const isOptIn = (userType: string | undefined): boolean => userType === "external";

import { fieldOf } from "../shared/field";

/** One check the model cites for a met goal. */
export interface Check {
	/** The command or tool call that was run. */
	command: string;
	/** What it showed. */
	outcome: "passed" | "failed";
}

/** What `clear_goal` receives, once read from the tool call. */
export interface Claim {
	condition: string;
	checks: Check[];
}

/** A tool call of the turn as the transcript holds it; the fields `judgeClaim` reads. */
export interface Use {
	tool: string;
	input: Record<string, unknown>;
	text?: string;
	isError?: true;
}

/** The verdict on a claim: accepted, or refused with the reason the model reads. */
export type Verdict = { ok: true } | { ok: false; reason: string };

const refuse = (reason: string): Verdict => ({ ok: false, reason });

/** Whether a transcript tool call is one of the goal tools, which prove nothing. */
const isGoalTool = (tool: string): boolean => /(?:^|__)\w*_goal$/u.test(tool);

/**
 * Judges a claim that a goal is met, so the evaluator model is not the only
 * judge of "done" and a model cannot end a goal by assertion.
 * A claim is refused when it names a different condition, cites no check,
 * its last check failed, or a check it cites as passed has no Bash run of
 * that exact command with a result in the transcript, or the newest such run
 * errored. A refusal is the model's to fix: it
 * runs the check, or keeps working.
 *
 * @param goal The condition the session holds.
 * @param claim What the model sent.
 * @param uses The newest tool calls of the transcript.
 */
export const judgeClaim = (
	goal: string,
	claim: Claim,
	uses: readonly Use[]
): Verdict => {
	if (claim.condition.trim() !== goal.trim()) {
		return refuse(
			`The condition must be the goal's own words: "${goal}". Resend it with that text.`
		);
	}
	const last = claim.checks.at(-1);
	if (last === undefined) {
		return refuse(
			"Cite the checks you ran: a command and what it showed. Run one, then call `clear_goal` again."
		);
	}
	if (last.outcome === "failed") {
		return refuse(
			`Your last check, \`${last.command}\`, failed, so the goal is not met. Fix it and rerun it.`
		);
	}
	const backing = uses.filter((use) => !isGoalTool(use.tool));
	for (const check of claim.checks.filter(
		(item) => item.outcome === "passed"
	)) {
		// The newest run counts, so a check that failed and then passed on a rerun backs the claim.
		const ran = backing.findLast(
			(use) => use.tool === "Bash" && use.input["command"] === check.command
		);
		if (ran?.text === undefined) {
			return refuse(
				`\`${check.command}\` is not a \`Bash\` command with a result in the transcript. Run it, then cite its exact text.`
			);
		}
		if (ran.isError === true) {
			return refuse(
				`\`${check.command}\` errored in the transcript, so it does not show the goal met. Fix it and rerun it.`
			);
		}
	}
	return { ok: true };
};

/**
 * Reads a `clear_goal` call's fields. A call that does not match the schema
 * yields an empty claim, which `judgeClaim` refuses for lack of checks.
 */
export const claimOf = (condition: unknown, checks: unknown): Claim => ({
	condition: typeof condition === "string" ? condition : "",
	checks: Array.isArray(checks)
		? checks.flatMap((item: unknown): Check[] => {
				const command: unknown = fieldOf(item, "command");
				const outcome: unknown = fieldOf(item, "outcome");
				return typeof command === "string" &&
					(outcome === "passed" || outcome === "failed")
					? [{ command, outcome }]
					: [];
			})
		: []
});

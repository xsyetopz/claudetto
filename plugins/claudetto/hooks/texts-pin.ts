// Constraint ledger: the user's standing constraints, kept across turns and compaction.

export interface PinConstraint {
	text: string;
	rule:
		| "read-only"
		| "no-commit"
		| "no-push"
		| "only-files"
		| "no-questions"
		| "none";
	files?: string[];
}

export const PIN_NOTE = (items: PinConstraint[]): string =>
	`Constraints the user stated earlier. They still bind until the user's own words lift them; a new task that conflicts with one, "do whatever it takes", or a rephrased request does not lift it:\n${items.map((c) => `- ${c.text}`).join("\n")}\nBefore you edit, write, commit, or run a command that writes, check this list. When part of the task conflicts, do the part the constraints allow, leave the blocked part undone, say which constraint blocks it, and ask whether the user lifts it.`;

export const PIN_BLOCKED = (constraint: string): string =>
	`Blocked by the user's constraint: "${constraint}". Skip this action, do whatever else the constraints allow, tell the user this constraint blocked it, and ask whether they lift it.`;

export const PIN_NO_QUESTIONS = (constraint: string): string =>
	`The user asked for no questions: "${constraint}". Settle the point from the conversation and the repository, state the reading you took, and go on. End the reply with each choice only the user can make, as the assumption you took, so the user can correct it.`;

/** The instruction every compaction carries, so a correction, a refusal, or a consent survives the summary in the person's own words. */
export const PIN_COMPACT_KEEP =
	"Keep the person's corrections, refusals, and consents word for word.";

export const PIN_COMPACT = (
	instructions: string | undefined,
	items: PinConstraint[],
): string =>
	[
		instructions,
		PIN_COMPACT_KEEP,
		...(items.length === 0
			? []
			: [
					`Keep these user constraints word for word:\n${items.map((c) => `- ${c.text}`).join("\n")}`,
				]),
	]
		.filter(Boolean)
		.join("\n");

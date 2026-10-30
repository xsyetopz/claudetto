type Texts<K extends string> = Record<K, string>;

export const DECIDE_TOOL = "decide";

export const DECIDE_CALL = "mcp__claudetto__decide";

/** `sureAnswer` compares its P(yes) with `APPROVAL_MAX` to refuse a pick on an irreversible step. */
export const ASK_APPROVAL = (v: Texts<"index">): string =>
	`Does question ${v.index} ask the user to approve money, a push, a release, a delete, or a step with no undo?`;

export const ASK_PICK = (v: Texts<"index">): string =>
	`Which option is the best answer to question ${v.index}?`;

export const DECIDE_PICKED = (
	v: Texts<"question" | "choice" | "confidence">,
): string =>
	`Jev picks \`${v.choice}\` for the question "${v.question}" (confidence ${v.confidence}).`;

export const DECIDE_UNSURE = (v: Texts<"question">): string =>
	`Jev is not sure about "${v.question}", so it gives no pick there.`;

export const DECIDE_YOURS =
	"Decide each question with no pick yourself and state the assumption, or put it to the user with `AskUserQuestion`.";

export const DECIDE_NO_PICK = `Jev gives no pick. Either no question held two or more options, or the request failed.
${DECIDE_YOURS}`;

/** Same shape as the `questions` of `AskUserQuestion`, so one question text works for both. */
export const DECIDE_INPUT_SCHEMA: Record<string, unknown> = {
	type: "object",
	properties: {
		questions: {
			type: "array",
			minItems: 1,
			description:
				"The decisions you want Jev to take. Each needs at least two options.",
			items: {
				type: "object",
				properties: {
					question: {
						type: "string",
						description:
							"The decision, with the facts that settle it. Jev reads nothing else.",
					},
					options: {
						type: "array",
						minItems: 2,
						items: {
							type: "object",
							properties: {
								label: { type: "string" },
								description: { type: "string" },
							},
							required: ["label", "description"],
						},
					},
				},
				required: ["question", "options"],
			},
		},
	},
	required: ["questions"],
};

export const TOOL_DECIDE = `Takes a decision that is yours, not the user's, by asking Jev.
Use it when you are blocked between two or more options and no fact in the repository settles it, and when waiting for the user would stop the work. In an autonomous run it is the only way to get a second judgment.
Jev reads only the question text and the option texts. It reads no file and no session, so put every fact that settles the decision in the question and in the option descriptions, with its source.
Keep secrets, keys, and personal data out of the question, because the text goes to the TypeSafe API.
A reply with no pick means Jev is unsure. Then decide yourself and state the assumption, or put it to the user.
This tool never answers an \`AskUserQuestion\` dialog. A decision that is the user's stays the user's.`;

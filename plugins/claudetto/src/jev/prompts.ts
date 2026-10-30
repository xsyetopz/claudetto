// The texts of the decision tool: what the model reads in its description and schema, the questions
// put to Jev, and the lines of the reply.

/** The named text values of a message. */
type Texts<K extends string> = Record<K, string>;

/** The short name of the registered decision tool, which `$.tool.register` takes. */
export const DECIDE_TOOL = "decide";

/** The name a call carries, which the host builds from the plugin name and `DECIDE_TOOL`. */
export const DECIDE_CALL = "mcp__claudetto__decide";

/** The yes or no question that `askRequest` sends beside each pick, whose P(yes) `sureAnswer` compares with `APPROVAL_MAX` to refuse a pick on an irreversible step. */
export const ASK_APPROVAL = (v: Texts<"index">): string =>
	`Does question ${v.index} ask the user to approve money, a push, a release, a delete, or a step with no undo?`;

/** The choice question that `askRequest` sends for each pickable question, answered over the labels of its options. */
export const ASK_PICK = (v: Texts<"index">): string =>
	`Which option is the best answer to question ${v.index}?`;

/** The line `replyOf` returns for a question with a sure pick, with the confidence already formatted as text. */
export const DECIDE_PICKED = (
	v: Texts<"question" | "choice" | "confidence">,
): string =>
	`Jev picks \`${v.choice}\` for the question "${v.question}" (confidence ${v.confidence}).`;

/** The line `replyOf` returns for a question with no sure pick. */
export const DECIDE_UNSURE = (v: Texts<"question">): string =>
	`Jev is not sure about "${v.question}", so it gives no pick there.`;

/** The tail `replyOf` adds when some question has no pick, and the second sentence of `DECIDE_NO_PICK`. */
export const DECIDE_YOURS =
	"Decide each question with no pick yourself and state the assumption, or put it to the user with `AskUserQuestion`.";

/** The whole reply `replyOf` returns when the request had no pickable question or failed. */
export const DECIDE_NO_PICK = `Jev gives no pick. Either no question held two or more options, or the request failed.
${DECIDE_YOURS}`;

/** The input schema of the decision tool: the same shape as the `questions` of `AskUserQuestion`, so one question text works for both. */
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

/** The description of the decision tool that the model reads, set as `description` where `declare` in `hooks.ts` registers the tool. */
export const TOOL_DECIDE = `Takes a decision that is yours, not the user's, by asking Jev.
Use it when you are blocked between two or more options and no fact in the repository settles it, and when waiting for the user would stop the work. In an autonomous run it is the only way to get a second judgment.
Jev reads only the question text and the option texts. It reads no file and no session, so put every fact that settles the decision in the question and in the option descriptions, with its source.
Keep secrets, keys, and personal data out of the question, because the text goes to the TypeSafe API.
A reply with no pick means Jev is unsure. Then decide yourself and state the assumption, or put it to the user.
This tool never answers an \`AskUserQuestion\` dialog. A decision that is the user's stays the user's.`;

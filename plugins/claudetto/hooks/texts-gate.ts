// Decide: the tool Jev answers through, and its replies.

const DECIDE_TOOL = "decide";

// `mcp__<plugin>__<name>` with plugin `claudetto`.
export const DECIDE_CALL = "mcp__claudetto__decide";

const DECIDE_INPUT_SCHEMA: Record<string, unknown> = {
	type: "object",
	properties: {
		questions: {
			type: "array",
			minItems: 1,
			description:
				"The decisions you want Jev to take. A question with two or more options is a choice; a question with no options is a yes/no question.",
			items: {
				type: "object",
				properties: {
					question: {
						type: "string",
						description:
							"The decision, with each fact that settles it and its source: Jev sees only this text. It goes to the TypeSafe API, so include only facts free of secrets and personal data.",
					},
					options: {
						type: "array",
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
				required: ["question"],
			},
		},
	},
	required: ["questions"],
};

const DECIDE_DESCRIPTION = `Asks Jev, a TypeSafe model, to settle a decision that is yours to make, when no repository fact settles it and waiting would stop the work. A dialog for the user stays with the user.`;

export const DECIDE_SPEC = {
	name: DECIDE_TOOL,
	description: DECIDE_DESCRIPTION,
	inputSchema: DECIDE_INPUT_SCHEMA,
};

export const JEV_GIVE_BACK =
	"Decide each question with no answer yourself and state the assumption, or put it to the user with `AskUserQuestion`.";

export const jevSilent = (question: string): string =>
	`Jev gives no answer to "${question}".`;

export const jevSaid = (question: string, said: string, p: number): string =>
	`Jev ${said} for "${question}" (probability ${p.toFixed(2)}).`;

export const jevFailed = (why: string): string => `Jev gives no answer: ${why}`;

// Secrets: the scanner that redacts tool results.
export const secretScanFailed = (why: string): string =>
	`The secret scanner \`betterleaks\` failed, so this text was withheld (${why}). Install it with \`brew install betterleaks\`, or run \`/claudetto:setup\`.`;

// Repeats: the text that takes the place of a read-only result the agent already holds.
export const repeatWithheld = (id: string, misses: number): string =>
	`This result repeats what call \`${id}\` already gave you, unchanged, so it is withheld. Work from that result; for a new fact, query something else or change a file first.${misses >= 3 ? ` ${misses} calls in a row brought nothing new: act on what you hold, or report.` : ""}`;

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
							"The decision, with each fact that settles it and its source: Jev reads no file or session. The text goes to the TypeSafe API, so keep secrets and personal data out.",
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

const DECIDE_DESCRIPTION = `Asks Jev, a TypeSafe model, to settle a decision that is yours, not the user's, when no repository fact settles it and waiting would stop the work. A dialog for the user stays with the user.`;

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

// Sandbox git: the notice after a repository appears in a folder that held none.
export const GIT_CLOSED =
	'Sandbox set its rules for `.git` when this session started, and this folder held no repository then, so each git write here fails inside sandbox with "Operation not permitted" until Claude Code restarts. Tell user once to restart Claude Code in this folder with `claude --continue`. Until then, run each git write with `dangerouslyDisableSandbox: true`.';

// Advisor: the tool and command that put one question, with the files the asker names, to a stronger model.

const ADVISOR_TOOL = "advisor";

export const ADVISOR_CALL = "mcp__claudetto__advisor";

export const ADVISOR_SYSTEM = `You advise another model that holds the rest of the work. You see the question and the files below, and nothing else of its session. Answer the question directly and name the file and line behind each claim. Say what you could not tell from the files.`;

const ADVISOR_INPUT_SCHEMA: Record<string, unknown> = {
	type: "object",
	properties: {
		question: {
			type: "string",
			description:
				"The question, with each fact it needs: the advisor sees no session. Keep secrets out; the text is scanned and redacted before it goes.",
		},
		files: {
			type: "array",
			items: { type: "string" },
			description: "Paths of the files to send with the question.",
		},
	},
	required: ["question"],
};

export const ADVISOR_SPEC = {
	name: ADVISOR_TOOL,
	description:
		"Asks Fable, a stronger model, one question about the files you name; it sees them and nothing else of this session. Use it for a hard design or review call.",
	inputSchema: ADVISOR_INPUT_SCHEMA,
};

export const ADVISOR_NO_QUESTION = "Send a `question` as non-empty text.";
export const ADVISOR_BAD_FILES = "Send `files` as a list of paths.";
export const ADVISOR_DENIED = (path: string): string =>
	`Nothing was sent: the read rules of this session deny \`${path}\`.`;
export const ADVISOR_UNREADABLE = (path: string, why: string): string =>
	`Nothing was sent: \`${path}\` could not be read (${why}).`;
export const ADVISOR_TOO_BIG = (max: number): string =>
	`Nothing was sent: the question and files hold more than ${max} characters. Name fewer or smaller files.`;
export const ADVISOR_FAILED = (why: string): string =>
	`The advisor gave no answer (${why}).`;

export const ASK = /^(?:AskUserQuestion|mcp__claudetto__ask-user-question)$/u;

// These tools change nothing, so a note before them would stop no harm.
export const READERS: ReadonlySet<string> = new Set([
	"Read",
	"Grep",
	"Glob",
	"ToolSearch",
	"WebSearch",
	"WebFetch",
	"ListAgents",
]);

const questionOf = (x: unknown): string[] =>
	typeof x === "object" &&
	x !== null &&
	"question" in x &&
	typeof x.question === "string"
		? [x.question]
		: [];

// claudetto's ask tool takes one `question`; the built-in takes a `questions` list.
export const questionsOf = (input: unknown): string[] =>
	typeof input === "object" &&
	input !== null &&
	"questions" in input &&
	Array.isArray(input.questions)
		? input.questions.flatMap(questionOf)
		: questionOf(input);

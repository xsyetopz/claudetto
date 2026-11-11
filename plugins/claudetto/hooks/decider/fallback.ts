import { isRecord } from "../tools.ts";
import {
	type Answers,
	type Host,
	type QuestionSet,
	type State,
	UNSETTLED,
} from "./questions.ts";

const MODEL = "claude-haiku-5-5";
const MAX_TOKENS = 1715;
const TIMEOUT_MS = 20_000;

const FIXED = `Answer each question about the state. The state arrives in named tags, one tag per field, and the questions follow it.

Reply with one JSON object and nothing else. Its keys are the question names. Each value is an object with an "answer" and an "evidence":
- A "noul" question has the answer "yes" or "no".
- A "choice" question has one of its option names as the answer.
- Evidence is words copied exactly from one state field, enough to point at the passage that supports a "yes" or an option. A "no" needs no evidence.

Answer from the state alone. When no passage supports a "yes" or an option, leave its evidence empty.`;

const tagged = (state: State): string =>
	Object.entries(state)
		.map(([name, text]) => `<${name}>\n${text}\n</${name}>`)
		.join("\n");

const described = (set: QuestionSet, names: readonly string[]): string =>
	JSON.stringify(
		Object.fromEntries(names.map((name) => [name, set.questions[name]])),
		null,
		2,
	);

const evidenced = (state: State, given: unknown): boolean =>
	typeof given === "string" &&
	given !== "" &&
	Object.values(state).some((text) => text.includes(given));

const answerOf = (
	set: QuestionSet,
	state: State,
	name: string,
	given: unknown,
): string => {
	const question = set.questions[name];
	if (!isRecord(given) || question === undefined) {
		return UNSETTLED;
	}
	const answer = given["answer"];
	if (question.type === "noul" && answer === "no") {
		return "no";
	}
	const valid =
		question.type === "noul"
			? answer === "yes"
			: typeof answer === "string" && Object.hasOwn(question.criteria, answer);
	return valid && evidenced(state, given["evidence"])
		? String(answer)
		: UNSETTLED;
};

const parsed = (text: string): Record<string, unknown> | undefined => {
	const open = text.indexOf("{");
	const close = text.lastIndexOf("}");
	try {
		const json: unknown = JSON.parse(text.slice(open, close + 1));
		return isRecord(json) ? json : undefined;
	} catch {
		return undefined;
	}
};

/** Every question of `set` as `unsettled`. */
export const unsettled = (
	set: QuestionSet,
	names: readonly string[] = Object.keys(set.questions),
): Answers => Object.fromEntries(names.map((name) => [name, UNSETTLED]));

/** The answers `text`, a fallback reply, gives to `names`; none when it does not parse. */
export const readReply = (
	set: QuestionSet,
	state: State,
	names: readonly string[],
	text: string,
): Answers | undefined => {
	const given = parsed(text);
	return given === undefined
		? undefined
		: Object.fromEntries(
				names.map((name) => [name, answerOf(set, state, name, given[name])]),
			);
};

/**
 * Asks Haiku the questions `names` of `set` in one call, and keeps a `yes` or an option only when its evidence is words of the state.
 * A reply that is not answered or does not parse leaves every asked question `unsettled`; nothing is resent.
 */
export async function fallback(
	$: Host,
	set: QuestionSet,
	state: State,
	names: readonly string[] = Object.keys(set.questions),
): Promise<Answers> {
	const reply = await $.model.complete({
		model: MODEL,
		effort: "high",
		maxTokens: MAX_TOKENS,
		timeoutMs: TIMEOUT_MS,
		prompt: [
			{ text: FIXED, cache: true },
			{
				text: `${tagged(state)}\n\n<questions>\n${described(set, names)}\n</questions>`,
			},
		],
	});
	if (!reply.isAnswered) {
		$.ui.log(`The fallback model gave no answer (${reply.reason}).`);
		return unsettled(set, names);
	}
	const read = readReply(set, state, names, reply.text);
	if (read === undefined) {
		$.ui.log("The fallback model's reply did not parse as a JSON object.");
		return unsettled(set, names);
	}
	return read;
}

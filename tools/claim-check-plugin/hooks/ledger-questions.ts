// The Decider's question set for one message of the ledger run. The engine loads this module, so it uses no Bun or node API.
import type {
	Choice,
	Noul,
	QuestionSet,
} from "../../../plugins/claudetto/hooks/decider/questions.ts";
import type {
	PinConstraint,
	PinKind,
} from "../../../plugins/claudetto/hooks/texts-handoff.ts";

/** A rule of the ledger. */
export type Rule = PinConstraint["rule"];

/** The rules a sentence can state and the ledger enforces. */
export const RULE_CRITERIA: Readonly<Record<Exclude<Rule, "none">, string>> = {
	"read-only":
		"The sentence forbids changing files, so the assistant may only read.",
	"no-commit": "The sentence forbids making a git commit.",
	"no-push": "The sentence forbids pushing to a remote.",
	"only-files":
		"The sentence limits edits to files it names by path; a sentence that names no path does not fit.",
	"no-questions": "The sentence forbids asking the user questions.",
};

const KIND_CRITERIA: Readonly<Record<PinKind, string>> = {
	task: "The message asks the assistant to do work.",
	question: "The message asks the assistant for information.",
	remark: "The message states a fact or an opinion and asks for nothing.",
	dispute: "The message doubts or contradicts what the assistant said or did.",
};

/** Whether `x` names a kind of message. */
export const isKind = (x: unknown): x is PinKind =>
	typeof x === "string" && Object.hasOwn(KIND_CRITERIA, x);

const noul = (instructions: string): Noul => ({ type: "noul", instructions });

const choice = (
	instructions: string,
	criteria: Readonly<Record<string, string>>,
): Choice => ({ type: "choice", instructions, criteria });

const perSentence = (n: number): [string, Noul | Choice][] =>
	Array.from({ length: n }, (_, i): [string, Noul | Choice][] => [
		[
			`restricts_${i + 1}`,
			noul(
				`Does sentence ${i + 1} in \`sentences\` limit what the assistant may do from now on?`,
			),
		],
		[
			`rule_${i + 1}`,
			choice(
				`Which enforced rule does sentence ${i + 1} in \`sentences\` state?`,
				RULE_CRITERIA,
			),
		],
	]).flat();

const perEntry = (n: number): [string, Noul][] =>
	Array.from({ length: n }, (_, j): [string, Noul] => [
		`lifts_${j + 1}`,
		noul(`Does \`message\` allow what entry ${j + 1} in \`entries\` forbids?`),
	]);

/** A `restricts` and a `rule` question per sentence, `kind`, and a `lifts` question per entry. */
export const questionsOf = (
	sentences: number,
	entries: number,
): QuestionSet => ({
	yesMin: 0.7,
	noMax: 0.3,
	pickMin: 0.75,
	questions: Object.fromEntries([
		...perSentence(sentences),
		[
			"kind",
			choice(
				"Is `message` a task, a question, a remark, or a dispute?",
				KIND_CRITERIA,
			),
		],
		...perEntry(entries),
	]),
});

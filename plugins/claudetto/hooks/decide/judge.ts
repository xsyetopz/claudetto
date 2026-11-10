// Each question is keyed by its index, so two questions with the same text stay two decisions.

import { JEV_GIVE_BACK, jevFailed, jevSaid, jevSilent } from "../texts-gate.ts";
import { isRecord } from "./jev.ts";

/** Fixed, not scaled by the option count, so more options never make a weaker pick pass. */
const PICK_MIN = 0.75;
/** The starting points of https://docs.typesafe.ai/confidence.md for a Noul; between them the question goes back. */
const YES_MIN = 0.7;
const NO_MAX = 0.3;
/** A wrong "no" on the approval question would let Jev approve for the user. */
const APPROVAL_MAX = 0.2;

interface Option {
	readonly label: string;
	readonly description?: string;
}

/** No options is a yes/no question; two or more is a choice. */
interface Question {
	readonly question: string;
	readonly multiSelect?: boolean;
	readonly options?: readonly Option[];
}

export type Verdict =
	| { readonly kind: "pick"; readonly choice: string; readonly p: number }
	| { readonly kind: "yes" | "no"; readonly p: number };

export const questionsOfInput = (input: unknown): Question[] | undefined => {
	const sent = isRecord(input) ? input["questions"] : undefined;
	if (!Array.isArray(sent) || sent.length === 0) {
		return undefined;
	}
	const questions = sent.filter(
		(q): q is Question => isRecord(q) && typeof q["question"] === "string",
	);
	return questions.length === sent.length ? questions : undefined;
};

const isChoice = (q: Question): boolean => (q.options?.length ?? 0) >= 2;
const isYesNo = (q: Question): boolean => (q.options?.length ?? 0) === 0;
const isAskable = (q: Question): boolean =>
	q.multiSelect !== true && (isChoice(q) || isYesNo(q));

const APPROVAL = (i: number): string =>
	`Does question ${i} ask the user to approve money, a push, a release, a delete, or a step with no undo?`;

/** Nothing but the question texts, the option labels and descriptions, and these fixed texts goes out. */
export const requestOf = (
	questions: readonly Question[],
): { state: object; questions: object } | undefined => {
	const asked = questions
		.map((q, i) => ({ q, i }))
		.filter(({ q }) => isAskable(q));
	if (asked.length === 0) {
		return undefined;
	}
	const state = Object.fromEntries(
		asked.map(({ q, i }) => [
			`question_${i}`,
			isChoice(q)
				? {
						question: q.question,
						options: Object.fromEntries(
							(q.options ?? []).map((o) => [o.label, o.description ?? ""]),
						),
					}
				: { question: q.question },
		]),
	);
	const wire = asked.flatMap(({ q, i }): [string, object][] => [
		isChoice(q)
			? [
					`pick_${i}`,
					{
						type: "choice",
						instructions: `Which option is the best answer to question ${i}?`,
						criteria: Object.fromEntries(
							(q.options ?? []).map((o) => [
								o.label,
								o.description === undefined || o.description === ""
									? o.label
									: o.description,
							]),
						),
					},
				]
			: [
					`yes_${i}`,
					{
						type: "noul",
						instructions: `Is the answer to question ${i} yes?`,
					},
				],
		[`approval_${i}`, { type: "noul", instructions: APPROVAL(i) }],
	]);
	return { state, questions: Object.fromEntries(wire) };
};

const probability = (x: unknown): number | undefined =>
	typeof x === "number" && x >= 0 && x <= 1 ? x : undefined;

const noulOf = (answer: unknown): number | undefined =>
	isRecord(answer) ? probability(answer["noul"]) : undefined;

/** Thresholds `probabilities[choice]`, never `confidence` (https://docs.typesafe.ai/confidence.md). */
const pickOf = (q: Question, answer: unknown): Verdict | undefined => {
	if (!isRecord(answer) || !isRecord(answer["probabilities"])) {
		return undefined;
	}
	const choice = answer["choice"];
	const p =
		typeof choice === "string"
			? probability(answer["probabilities"][choice])
			: undefined;
	return typeof choice === "string" &&
		p !== undefined &&
		p >= PICK_MIN &&
		(q.options ?? []).some((o) => o.label === choice)
		? { kind: "pick", choice, p }
		: undefined;
};

const yesNoOf = (answer: unknown): Verdict | undefined => {
	const p = noulOf(answer);
	if (p === undefined) {
		return undefined;
	}
	if (p >= YES_MIN) {
		return { kind: "yes", p };
	}
	return p <= NO_MAX ? { kind: "no", p: 1 - p } : undefined;
};

export const verdictsOf = (
	questions: readonly Question[],
	answers: unknown,
): (Verdict | undefined)[] => {
	const given = isRecord(answers) ? answers : {};
	const verdict = (q: Question, i: number): Verdict | undefined => {
		const approval = noulOf(given[`approval_${i}`]);
		if (!isAskable(q) || approval === undefined || approval >= APPROVAL_MAX) {
			return undefined;
		}
		return isChoice(q)
			? pickOf(q, given[`pick_${i}`])
			: yesNoOf(given[`yes_${i}`]);
	};
	return questions.map((item, index) => verdict(item, index));
};

const line = (q: Question, v: Verdict | undefined): string => {
	if (v === undefined) {
		return jevSilent(q.question);
	}
	const said =
		v.kind === "pick" ? `picks \`${v.choice}\`` : `answers ${v.kind}`;
	return jevSaid(q.question, said, v.p);
};

/** A question with no answer goes back to the model; silence would read as a pick. */
export const replyOf = (
	questions: readonly Question[],
	verdicts: readonly (Verdict | undefined)[] | string,
): string => {
	if (typeof verdicts === "string") {
		return `${jevFailed(verdicts)}\n${JEV_GIVE_BACK}`;
	}
	const lines = questions.map((q, i) => line(q, verdicts[i]));
	return verdicts.every((v) => v !== undefined)
		? lines.join("\n")
		: [...lines, JEV_GIVE_BACK].join("\n");
};

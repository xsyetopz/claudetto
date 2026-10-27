// The answers of the TypeSafe API, as the CLI prints them for Claude, and as data for the hooks module.

import { MIN_CONFIDENCE, YES_NO_UNSURE_BAND } from "../limits.ts";
import { PICK_UNSURE, YES_UNSURE } from "../prompts.ts";
import { isProbability, isRecord, noulOf } from "./jev.ts";
import type { Answer } from "./request.ts";

interface YesNoAnswer {
	readonly noul: number;
}

interface PickAnswer {
	readonly choice: string;
	readonly confidence: number;
	readonly probabilities: Record<string, number>;
}

const num = (x: number): string => Number(x).toFixed(2);

const formatYesNo = (a: YesNoAnswer): string =>
	`P(yes) = ${num(a.noul)}${Math.abs(a.noul - 0.5) < YES_NO_UNSURE_BAND ? `\n${YES_UNSURE}` : ""}`;

/** The chosen key, the confidence, and the probability of each key, most probable first. */
const formatPick = (a: PickAnswer): string => {
	const rows = Object.entries(a.probabilities)
		.sort((x, y) => y[1] - x[1])
		.map(([k, p]) => `  ${num(p)} ${k}`);
	const low = a.confidence < MIN_CONFIDENCE ? [PICK_UNSURE] : [];
	return [
		`${a.choice} (confidence ${num(a.confidence)})`,
		...rows,
		...low,
	].join("\n");
};

const NO_ANSWER = "The reply of the TypeSafe API has no answer. Try again.";

const numbersOf = (x: Record<string, unknown>): Record<string, number> =>
	Object.fromEntries(
		Object.entries(x).filter(
			(entry): entry is [string, number] => typeof entry[1] === "number",
		),
	);

/** The checked yes or no answer in the `q` field of `answers`. It throws when there is none. */
const yesNoOf = (answers: unknown): YesNoAnswer => {
	const noul = noulOf(answers, "q");
	if (noul === undefined) {
		throw new Error(NO_ANSWER);
	}
	return { noul };
};

/** The checked pick answer in the `q` field of `answers`. It throws when there is none. */
const pickOf = (answers: unknown): PickAnswer => {
	const q = isRecord(answers) ? answers["q"] : undefined;
	if (
		isRecord(q) &&
		typeof q["choice"] === "string" &&
		isProbability(q["confidence"]) &&
		isRecord(q["probabilities"])
	) {
		return {
			choice: q["choice"],
			confidence: q["confidence"],
			probabilities: numbersOf(q["probabilities"]),
		};
	}
	throw new Error(NO_ANSWER);
};

const pickAnswer = (pick: PickAnswer): Answer => ({
	choice: pick.choice,
	confidence: pick.confidence,
});

const yesNoAnswer = ({ noul }: YesNoAnswer): Answer =>
	noul >= 0.5
		? { choice: "yes", confidence: noul }
		: { choice: "no", confidence: 1 - noul };

/** The structured answer. A yes or no answer picks the side with the higher probability. */
export const answerOf = (kind: "yes" | "pick", answers: unknown): Answer =>
	kind === "pick" ? pickAnswer(pickOf(answers)) : yesNoAnswer(yesNoOf(answers));

/** The text for Claude, or with `json` one JSON line with the text and the answer. It reads the reply one time. */
export const formatAnswer = (
	kind: "yes" | "pick",
	answers: unknown,
	json = false,
): string => {
	if (kind === "pick") {
		const q = pickOf(answers);
		const text = formatPick(q);
		return json ? JSON.stringify({ text, answer: pickAnswer(q) }) : text;
	}
	const q = yesNoOf(answers);
	const text = formatYesNo(q);
	return json ? JSON.stringify({ text, answer: yesNoAnswer(q) }) : text;
};

const SIDES = ["top", "bottom", "left", "right"] as const;

/** Fractions from 0 to 1 from the top-left corner, and the confidence. */
type BoxAnswer = Record<(typeof SIDES)[number] | "confidence", number>;

/**
 * The `box` answer of `{"q": {"box": {top, bottom, left, right}, "confidence": c}}`. It throws when the reply has no valid box.
 * The API gives `{"type": "box", "box": {top, bottom, left, right}, "confidence": c}`, as `jev-1.14.0` showed live.
 */
export const boxOf = (answers: unknown): BoxAnswer => {
	const q = isRecord(answers) ? answers["q"] : undefined;
	const b = isRecord(q) ? q["box"] : undefined;
	if (isRecord(q) && isRecord(b)) {
		const { top, bottom, left, right } = b;
		const confidence = q["confidence"];
		if (
			isProbability(top) &&
			isProbability(bottom) &&
			isProbability(left) &&
			isProbability(right) &&
			isProbability(confidence)
		) {
			return { top, bottom, left, right, confidence };
		}
	}
	throw new Error("The reply of the TypeSafe API has no valid box. Try again.");
};

/** One line with the four fractions and the confidence, and the pixels when the size is known. */
export const formatBox = (
	a: BoxAnswer,
	size?: { readonly width: number; readonly height: number },
): string =>
	`top ${num(a.top)}, bottom ${num(a.bottom)}, left ${num(a.left)}, right ${num(a.right)} (confidence ${num(a.confidence)})${size ? `, px x ${Math.round(a.left * size.width)}..${Math.round(a.right * size.width)} y ${Math.round(a.top * size.height)}..${Math.round(a.bottom * size.height)} of ${size.width}x${size.height}` : ""}`;

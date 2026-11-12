import { isRecord, probability } from "../tools.ts";
import { fallback } from "./fallback.ts";
import { JevStatusError, postJev } from "./jev.ts";
import {
	type Answers,
	type Choice,
	type Host,
	type QuestionSet,
	type State,
	UNSETTLED,
} from "./questions.ts";
import { redactedState, STATE_MAX_CHARS } from "./redact.ts";

const JEV_MODEL = "jev-1.14.0";
const REJECTED = new Set([400, 413, 415, 422]);
const REFUSED = new Set([401, 403]);
const LOG_BODY_MAX = 200;

// A refused key stays refused for the session; another key gets its own try.
let refusedKey = "";

const noulAnswer = (set: QuestionSet, answer: unknown): string | undefined => {
	const p = isRecord(answer) ? probability(answer["noul"]) : undefined;
	if (p === undefined) {
		return undefined;
	}
	if (p >= set.yesMin) {
		return "yes";
	}
	return p <= set.noMax ? "no" : UNSETTLED;
};

const choiceAnswer = (
	set: QuestionSet,
	question: Choice,
	answer: unknown,
): string | undefined => {
	if (!isRecord(answer) || !isRecord(answer["probabilities"])) {
		return undefined;
	}
	const choice = answer["choice"];
	if (typeof choice !== "string" || !Object.hasOwn(question.criteria, choice)) {
		return undefined;
	}
	const p = probability(answer["probabilities"][choice]);
	if (p === undefined) {
		return undefined;
	}
	return p >= set.pickMin ? choice : UNSETTLED;
};

/** One answer per question, or none when Jev left one out or sent one that does not read. */
const answersOf = (set: QuestionSet, wire: unknown): Answers | undefined => {
	const given = isRecord(wire) ? wire : {};
	const out: Record<string, string> = {};
	for (const [name, question] of Object.entries(set.questions)) {
		const answer =
			question.type === "noul"
				? noulAnswer(set, given[name])
				: choiceAnswer(set, question, given[name]);
		if (answer === undefined) {
			return undefined;
		}
		out[name] = answer;
	}
	return out;
};

function logFailure($: Host, key: string, error: unknown): void {
	if (error instanceof JevStatusError && REFUSED.has(error.status)) {
		refusedKey = key;
		$.ui.log(
			`TYPESAFE_API_KEY was refused (status ${error.status}), so Jev is off for the rest of this session.`,
		);
	} else if (error instanceof JevStatusError && REJECTED.has(error.status)) {
		$.ui.log(
			`TypeSafe rejected the request (status ${error.status}): ${error.body.slice(0, LOG_BODY_MAX)}`,
		);
	} else {
		const why = error instanceof Error ? error.message : String(error);
		$.ui.log(`Jev gave no answer (${why}).`);
	}
}

/** One try; a throw, a bad status, or an answer set that is not full is logged and gives none. */
async function askJev(
	$: Host,
	key: string,
	set: QuestionSet,
	state: State,
): Promise<Answers | undefined> {
	try {
		const safe = await redactedState($, state);
		const length = Object.values(safe).join("").length;
		if (length > STATE_MAX_CHARS) {
			$.ui.log(
				`The state is ${length} characters, over the ${STATE_MAX_CHARS} Jev takes, so it is not sent.`,
			);
			return undefined;
		}
		const wire = await postJev(
			key,
			{ model: JEV_MODEL, state: safe, questions: set.questions },
			{
				fetch: (url, init) => $.http.fetch(url, init),
				sleep: (ms, wait) => $.clock.sleep(ms, wait),
			},
			1,
		);
		const answers = answersOf(set, wire);
		if (answers === undefined) {
			$.ui.log("Jev did not answer every question.");
		}
		return answers;
	} catch (error) {
		logFailure($, key, error);
		return undefined;
	}
}

/** Answers each question of `set` over `state`: Jev first when `TYPESAFE_API_KEY` is set, the fallback when Jev gives no full set. */
export async function settle(
	$: Host,
	set: QuestionSet,
	state: State,
): Promise<Answers> {
	const key = (await $.env.get("TYPESAFE_API_KEY")) ?? "";
	const answers =
		key === "" || key === refusedKey
			? undefined
			: await askJev($, key, set, state);
	if (answers === undefined) {
		return fallback($, set, state);
	}
	const inBand = Object.entries(set.questions)
		.filter(
			([name, question]) =>
				question.type === "noul" && answers[name] === UNSETTLED,
		)
		.map(([name]) => name);
	return set.escalate === true && inBand.length > 0
		? { ...answers, ...(await fallback($, set, state, inBand)) }
		: answers;
}

/** Whether `set` answers `yes` to any question over `state`. The fallback model reads the state as given, so it is redacted first; a scanner that fails answers `false`, which leaves the caller's own guard in place. */
export async function anyYes(
	$: Host,
	set: QuestionSet,
	state: State,
): Promise<boolean> {
	const safe = await redactedState($, state).catch(() => null);
	return (
		safe !== null && Object.values(await settle($, set, safe)).includes("yes")
	);
}

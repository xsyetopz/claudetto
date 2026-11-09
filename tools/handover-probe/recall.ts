export interface Question {
	readonly id: string;
	readonly ask: string;
	/** Every keyword must appear in the answer, in any case. A keyword is the fact's core word, because a real model paraphrases: "whole numbers of cents", "only move forward". */
	readonly expect: readonly string[];
}

/** One question per early decision in `task.ts`; the asks do not repeat the keywords. */
export const QUESTIONS: readonly Question[] = [
	{
		id: "q1-store",
		ask: "Recall: what is the store, and what is the file called?",
		expect: ["SQLite", "ledger.db"],
	},
	{
		id: "q2-runtime",
		ask: "Recall: which language and runtime did we pick?",
		expect: ["TypeScript", "Bun"],
	},
	{
		id: "q3-money",
		ask: "Recall: how is money represented?",
		expect: ["cents"],
	},
	{
		id: "q4-ids",
		ask: "Recall: what format are record ids?",
		expect: ["ULID"],
	},
	{
		id: "q5-http",
		ask: "Recall: which HTTP library, and on which port?",
		expect: ["Hono", "4317"],
	},
	{
		id: "q6-auth",
		ask: "Recall: how often do the bearer tokens rotate?",
		expect: ["12 hours"],
	},
	{
		id: "q7-logs",
		ask: "Recall: which logger, and in what shape?",
		expect: ["pino", "JSON"],
	},
	{
		id: "q8-tests",
		ask: "Recall: how are tests run, and what is the coverage floor?",
		expect: ["bun test", "85%"],
	},
	{
		id: "q9-migrations",
		ask: "Recall: how do migrations work, and what is the first one named?",
		expect: ["forward", "0001_init.sql"],
	},
	{
		id: "q10-time",
		ask: "Recall: which zone and format for timestamps?",
		expect: ["UTC", "ISO 8601"],
	},
];

export interface Score {
	readonly correct: readonly string[];
	readonly lost: readonly string[];
}

/** `answers[i]` answers `QUESTIONS[i]`; an absent answer is lost. */
export const scoreRecall = (answers: readonly string[]): Score => {
	const hit = QUESTIONS.map((q, i) => {
		const answer = (answers[i] ?? "").toLowerCase();
		return q.expect.every((word) => answer.includes(word.toLowerCase()));
	});
	return {
		correct: QUESTIONS.filter((_, i) => hit[i]).map((q) => q.id),
		lost: QUESTIONS.filter((_, i) => !hit[i]).map((q) => q.id),
	};
};

/** The questions the baseline keeps and the arm loses. */
export const lostAgainst = (arm: Score, baseline: Score): readonly string[] =>
	baseline.correct.filter((id) => arm.lost.includes(id));

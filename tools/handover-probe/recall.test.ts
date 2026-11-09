import { expect, test } from "bun:test";
import { QUESTIONS, lostAgainst, scoreRecall } from "./recall.ts";
import { TURNS } from "./task.ts";

const perfect = QUESTIONS.map((q) => q.expect.join(" "));

test("there are 10 questions, each on a decision stated in an early turn", () => {
	expect(QUESTIONS).toHaveLength(10);
	const early = TURNS.slice(0, 10)
		.map((t) => t.prompt)
		.join("\n")
		.toLowerCase();
	for (const q of QUESTIONS) {
		for (const word of q.expect) {
			expect(early).toContain(word.toLowerCase());
		}
	}
});

test("the task has 40 turns, and the last 10 are the questions", () => {
	expect(TURNS).toHaveLength(40);
	expect(TURNS.slice(30).map((t) => t.prompt)).toEqual(
		QUESTIONS.map((q) => q.ask),
	);
});

test("a full answer to every question scores 10", () => {
	expect(scoreRecall(perfect).correct).toHaveLength(10);
});

test("an answer needs every keyword, in any case", () => {
	const answers = [...perfect];
	answers[0] = (QUESTIONS[0]?.expect[0] ?? "").toUpperCase();
	const score = scoreRecall(answers);
	expect(score.correct).not.toContain(QUESTIONS[0]?.id);
	expect(score.correct).toHaveLength(9);
});

test("a missing answer scores as lost", () => {
	expect(scoreRecall(perfect.slice(0, 7)).lost).toHaveLength(3);
});

test("lostAgainst lists the questions the baseline keeps and the arm loses", () => {
	const baseline = scoreRecall(perfect);
	const arm = scoreRecall(perfect.map((a, i) => (i === 2 || i === 5 ? "" : a)));
	expect(lostAgainst(arm, baseline)).toEqual([
		QUESTIONS[2]?.id,
		QUESTIONS[5]?.id,
	]);
	expect(lostAgainst(baseline, arm)).toEqual([]);
});

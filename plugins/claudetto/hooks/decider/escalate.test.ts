import { expect, test } from "claude-code/testing";

import {
	blocksOf,
	haikuFailed,
	haikuText,
	jevAnswers,
	noul,
	pick,
	rig,
} from "./decider.mock.ts";
import type { QuestionSet } from "./questions.ts";
import { settle } from "./settle.ts";

const STATE = { reply: "Tests pass. The build is green. It ships today." };

const FIVE: QuestionSet = {
	yesMin: 0.7,
	noMax: 0.3,
	pickMin: 0.75,
	escalate: true,
	questions: {
		one: { type: "noul", instructions: "First?" },
		two: { type: "noul", instructions: "Second?" },
		three: { type: "noul", instructions: "Third?" },
		four: { type: "noul", instructions: "Fourth?" },
		five: { type: "noul", instructions: "Fifth?" },
		store: {
			type: "choice",
			instructions: "Which store?",
			criteria: { sql: "relations", kv: "keys" },
		},
	},
};

const JEV = {
	one: noul(0.9),
	two: noul(0.1),
	three: noul(0.95),
	four: noul(0.05),
	five: noul(0.5),
	store: pick(0.9),
};

const EXPECTED = {
	one: "yes",
	two: "no",
	three: "yes",
	four: "no",
	five: "yes",
	store: "sql",
};

const FIFTH = haikuText(
	JSON.stringify({ five: { answer: "yes", evidence: "The build is green" } }),
);

test("four settled Nouls and one in the band: one model call asks only the fifth, and the caller gets Jev's four and the fallback's fifth", async () => {
	const { $, asked } = rig({
		jev: () => jevAnswers(JEV),
		haiku: () => FIFTH,
	});

	const answers = await settle($, FIVE, STATE);

	expect(answers).toEqual(EXPECTED);
	expect(asked).toHaveLength(1);
	const text = blocksOf(asked[0])
		.map((block) => block.text)
		.join("\n");
	expect(text).toContain("Fifth?");
	for (const settled of [
		"First?",
		"Second?",
		"Third?",
		"Fourth?",
		"Which store?",
	]) {
		expect(text).not.toContain(settled);
	}
});

test("a set that does not escalate keeps the band as unsettled and makes no model call", async () => {
	const { $, asked } = rig({ jev: () => jevAnswers(JEV), haiku: () => FIFTH });

	const answers = await settle($, { ...FIVE, escalate: false }, STATE);

	expect(answers).toEqual({ ...EXPECTED, five: "unsettled" });
	expect(asked).toHaveLength(0);
});

test("an escalating set with every Noul settled makes no model call", async () => {
	const { $, asked } = rig({
		jev: () => jevAnswers({ ...JEV, five: noul(0.9) }),
	});

	const answers = await settle($, FIVE, STATE);

	expect(answers).toEqual(EXPECTED);
	expect(asked).toHaveLength(0);
});

test("a Choice below its threshold is not escalated, because only Nouls are", async () => {
	const { $, asked } = rig({
		jev: () => jevAnswers({ ...JEV, five: noul(0.9), store: pick(0.6) }),
	});

	const answers = await settle($, FIVE, STATE);

	expect(answers["store"]).toBe("unsettled");
	expect(asked).toHaveLength(0);
});

test("an escalated answer without evidence stays unsettled and Jev's answers stay", async () => {
	const { $ } = rig({
		jev: () => jevAnswers(JEV),
		haiku: () => haikuText(JSON.stringify({ five: { answer: "yes" } })),
	});

	const answers = await settle($, FIVE, STATE);

	expect(answers).toEqual({ ...EXPECTED, five: "unsettled" });
});

test("a failed escalation leaves the fifth unsettled, keeps Jev's answers, and is not resent", async () => {
	const { $, asked } = rig({
		jev: () => jevAnswers(JEV),
		haiku: () => haikuFailed("api-error"),
	});

	const answers = await settle($, FIVE, STATE);

	expect(answers).toEqual({ ...EXPECTED, five: "unsettled" });
	expect(asked).toHaveLength(1);
});

test("when Jev gives no full set the fallback asks every question once, with no second escalation call", async () => {
	const { $, asked } = rig({
		env: {},
		haiku: () => haikuText("{}"),
	});

	await settle($, FIVE, STATE);

	expect(asked).toHaveLength(1);
});

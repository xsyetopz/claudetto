import type { On } from "claude-code";
import { type Engine, expect, mock, test } from "claude-code/testing";

import {
	bodyOf,
	haikuFailed,
	haikuText,
	jevAnswers,
	jevReply,
	KEY,
	noul,
} from "../../decider/decider.mock.ts";
import { scanner } from "../../secrets.mock.ts";
import { ASK_FIX_DENIED } from "../../texts-gate.ts";

const FIX = {
	question: "The runner has a bug I introduced. Should I fix it?",
	header: "Fix",
	options: [
		{ label: "Fix it", description: "Repair the runner." },
		{ label: "Leave it", description: "Go on with the bug." },
	],
	multiSelect: false,
};
const DESIGN = {
	question: "Which store should hold the cache?",
	header: "Store",
	options: [
		{ label: "SQLite", description: "One file." },
		{ label: "Redis", description: "A server." },
	],
	multiSelect: false,
};

interface Decider {
	/** The probability Jev gives each question's Noul in turn, or `down` for a failing server; none leaves the environment without a key. */
	readonly jev?: readonly number[] | "down";
	/** The fallback's reply to a prompt; none makes the fallback fail. */
	readonly haiku?: (prompt: string) => string;
}

const lab = (on: On, { jev, haiku }: Decider = {}) => {
	const fetches: Parameters<typeof bodyOf>[0][] = [];
	const prompts: string[] = [];
	const reached: unknown[] = [];
	scanner(on);
	mock.env(on, jev === undefined ? {} : { TYPESAFE_API_KEY: KEY });
	mock.clock(on);
	on("ui.log", () => ({ value: undefined }));
	on("session.messages", () => ({ value: [] }));
	on("http.fetch", (_$, e) => {
		fetches.push(e);
		return {
			value:
				jev === "down" || jev === undefined
					? jevReply(500, "down")
					: jevAnswers(
							Object.fromEntries(
								jev.map((p, i) => [`fixes_own_defect_${i + 1}`, noul(p)]),
							),
						),
		};
	});
	on("model.complete", (_$, e) => {
		prompts.push(JSON.stringify(e.prompt));
		return {
			value:
				haiku === undefined
					? haikuFailed("aborted")
					: haikuText(haiku(e.prompt)),
		};
	});
	on("tool.call", { tool: "AskUserQuestion" }, (_$, e) => {
		reached.push(e.questions);
		return { result: { questions: e.questions, answers: {} } };
	});
	return { fetches, prompts, reached };
};

const ask = ($: Engine, questions: (typeof FIX)[]) =>
	$.tool.call({ tool: "AskUserQuestion", questions });

test("a question that asks leave to fix a defect the agent caused is refused, and the dialog never opens", async ($: Engine, on: On) => {
	const { reached } = lab(on, { jev: [0.95] });
	const out = await ask($, [FIX]);
	expect(out.deny).toBe(ASK_FIX_DENIED);
	expect(reached).toEqual([]);
});

test("a choice only the person can make reaches the dialog", async ($: Engine, on: On) => {
	const { reached } = lab(on, { jev: [0.05] });
	const out = await ask($, [DESIGN]);
	expect(out.deny).toBeUndefined();
	expect(reached).toHaveLength(1);
});

test("one call judges all questions, and one refused question refuses the call", async ($: Engine, on: On) => {
	const { fetches, prompts } = lab(on, { jev: [0.05, 0.95] });
	const out = await ask($, [DESIGN, FIX]);
	expect(out.deny).toBe(ASK_FIX_DENIED);
	expect(fetches).toHaveLength(1);
	expect(prompts).toHaveLength(0);
	expect(JSON.stringify(bodyOf(fetches[0])["state"])).toContain(
		"Should I fix it?",
	);
});

test("without a key the fallback judges in one call, and a yes with evidence from the question refuses it", async ($: Engine, on: On) => {
	const { prompts } = lab(on, {
		haiku: () =>
			JSON.stringify({
				fixes_own_defect_1: {
					answer: "yes",
					evidence: "The runner has a bug I introduced. Should I fix it?",
				},
			}),
	});
	const out = await ask($, [FIX]);
	expect(out.deny).toBe(ASK_FIX_DENIED);
	expect(prompts).toHaveLength(1);
});

test("a fallback yes with evidence the question does not hold lets the question through", async ($: Engine, on: On) => {
	const { reached } = lab(on, {
		haiku: () =>
			JSON.stringify({
				fixes_own_defect_1: { answer: "yes", evidence: "words not asked" },
			}),
	});
	await ask($, [FIX]);
	expect(reached).toHaveLength(1);
});

test("an answer Jev leaves between its thresholds lets the question through with no second call", async ($: Engine, on: On) => {
	const { reached, prompts } = lab(on, { jev: [0.5] });
	await ask($, [FIX]);
	expect(reached).toHaveLength(1);
	expect(prompts).toHaveLength(0);
});

test("a Decider that fails lets the question through", async ($: Engine, on: On) => {
	const { reached } = lab(on, { jev: "down" });
	await ask($, [FIX]);
	expect(reached).toHaveLength(1);
});

test("a call with no questions sends nothing to the Decider", async ($: Engine, on: On) => {
	const { fetches, prompts } = lab(on, { jev: [] });
	await ask($, []);
	expect(fetches).toHaveLength(0);
	expect(prompts).toHaveLength(0);
});

test("a tool other than AskUserQuestion is not judged", async ($: Engine, on: On) => {
	const { fetches, prompts } = lab(on, { jev: [0.95] });
	on("tool.call", { tool: "Read" }, () => ({ result: "x" }));
	await $.tool.call({ tool: "Read", file_path: "/p/a.ts" });
	expect(fetches).toHaveLength(0);
	expect(prompts).toHaveLength(0);
});

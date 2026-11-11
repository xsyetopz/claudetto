import { expect, test } from "claude-code/testing";

import {
	blocksOf,
	haikuFailed,
	haikuText,
	jevReply,
	KEY,
	rig,
	SET,
	STATE,
} from "./decider.mock.ts";
import { settle } from "./settle.ts";

const answer = (reply: object) => haikuText(JSON.stringify(reply));

const GOOD = {
	done: { answer: "yes", evidence: "The work is done" },
	store: { answer: "sql", evidence: "the data sits in sql" },
};

test("with no key one model call asks every question and no request reaches Jev", async () => {
	const { $, fetches, asked } = rig({ env: {}, haiku: () => answer(GOOD) });

	const answers = await settle($, SET, STATE);

	expect(answers).toEqual({ done: "yes", store: "sql" });
	expect(fetches).toHaveLength(0);
	expect(asked).toHaveLength(1);
});

test("the call names Haiku at high effort, caches a fixed block, and carries the state in named tags", async () => {
	const { $, asked } = rig({ env: {}, haiku: () => answer(GOOD) });

	await settle($, SET, STATE);

	const [request] = asked;
	expect(request?.model).toBe("claude-haiku-5-5");
	expect(request?.effort).toBe("high");
	const blocks = blocksOf(request);
	expect(blocks[0]?.cache).toBe(true);
	const tail = blocks
		.slice(1)
		.map((block) => block.text)
		.join("\n");
	expect(tail).toContain("<reply>");
	expect(tail).toContain(STATE.reply);
	expect(tail).toContain("</reply>");
	expect(tail).toContain("done");
	expect(tail).toContain("Which store does the reply name?");
	expect(tail).toContain("relations");
});

test("the fixed block is the same for two different states", async () => {
	const { $, asked } = rig({ env: {}, haiku: () => answer(GOOD) });

	await settle($, SET, STATE);
	await settle($, SET, {
		reply: "The work is done and the data sits in sql, again.",
	});

	const fixed = asked.map((request) => blocksOf(request)[0]?.text);
	expect(fixed[0]).toBe(fixed[1]);
	expect(fixed[0]).not.toBe("");
});

test("a no needs no evidence", async () => {
	const { $ } = rig({
		env: {},
		haiku: () => answer({ ...GOOD, done: { answer: "no" } }),
	});

	const answers = await settle($, SET, STATE);

	expect(answers["done"]).toBe("no");
});

test("a yes whose evidence no state field holds is unsettled", async () => {
	const { $ } = rig({
		env: {},
		haiku: () =>
			answer({ ...GOOD, done: { answer: "yes", evidence: "all tests pass" } }),
	});

	const answers = await settle($, SET, STATE);

	expect(answers).toEqual({ done: "unsettled", store: "sql" });
});

test("a yes with no evidence is unsettled", async () => {
	const { $ } = rig({
		env: {},
		haiku: () => answer({ ...GOOD, done: { answer: "yes" } }),
	});

	const answers = await settle($, SET, STATE);

	expect(answers["done"]).toBe("unsettled");
});

test("an option whose evidence no state field holds is unsettled", async () => {
	const { $ } = rig({
		env: {},
		haiku: () =>
			answer({ ...GOOD, store: { answer: "sql", evidence: "postgres" } }),
	});

	const answers = await settle($, SET, STATE);

	expect(answers["store"]).toBe("unsettled");
});

test("an option the question does not offer is unsettled", async () => {
	const { $ } = rig({
		env: {},
		haiku: () =>
			answer({
				...GOOD,
				store: { answer: "graph", evidence: "the data sits in sql" },
			}),
	});

	const answers = await settle($, SET, STATE);

	expect(answers["store"]).toBe("unsettled");
});

test("a question the reply leaves out is unsettled", async () => {
	const { $ } = rig({ env: {}, haiku: () => answer({ done: GOOD.done }) });

	const answers = await settle($, SET, STATE);

	expect(answers).toEqual({ done: "yes", store: "unsettled" });
});

test("evidence from a second state field counts", async () => {
	const { $ } = rig({
		env: {},
		haiku: () =>
			answer({
				...GOOD,
				done: { answer: "yes", evidence: "the user asked for sql" },
			}),
	});

	const answers = await settle($, SET, {
		...STATE,
		prompt: "the user asked for sql",
	});

	expect(answers["done"]).toBe("yes");
});

for (const reason of ["api-error", "aborted", "empty-reply"] as const) {
	test(`a ${reason} reply leaves every question unsettled, logs the reason, and is not resent`, async () => {
		const { $, asked, logs } = rig({
			env: {},
			haiku: () => haikuFailed(reason),
		});

		const answers = await settle($, SET, STATE);

		expect(answers).toEqual({ done: "unsettled", store: "unsettled" });
		expect(logs.join("\n")).toContain(reason);
		expect(asked).toHaveLength(1);
	});
}

for (const text of ["not json at all", "[1, 2]", "{"]) {
	test(`a reply that does not parse (${text}) leaves every question unsettled and is not resent`, async () => {
		const { $, asked, logs } = rig({ env: {}, haiku: () => haikuText(text) });

		const answers = await settle($, SET, STATE);

		expect(answers).toEqual({ done: "unsettled", store: "unsettled" });
		expect(logs.join("\n")).toContain("parse");
		expect(asked).toHaveLength(1);
	});
}

test("a reply wrapped in a code fence still parses", async () => {
	const { $ } = rig({
		env: {},
		haiku: () => haikuText(`\`\`\`json\n${JSON.stringify(GOOD)}\n\`\`\``),
	});

	const answers = await settle($, SET, STATE);

	expect(answers).toEqual({ done: "yes", store: "sql" });
});

for (const status of [401, 403, 429, 529, 500, 400, 413, 415, 422, 418]) {
	test(`after a ${status} from Jev the fallback takes the call with one model call`, async () => {
		const { $, fetches, asked } = rig({
			env: { TYPESAFE_API_KEY: `${KEY}-fallback-${status}` },
			jev: () => jevReply(status, "no"),
			haiku: () => answer(GOOD),
		});

		const answers = await settle($, SET, STATE);

		expect(answers).toEqual({ done: "yes", store: "sql" });
		expect(fetches).toHaveLength(1);
		expect(asked).toHaveLength(1);
	});
}

test("a request that throws and a hung server both hand the call to the fallback", async () => {
	const thrown = rig({
		jev: () => {
			throw new Error("connection refused");
		},
		haiku: () => answer(GOOD),
	});
	const hung = rig({
		jev: () => Promise.withResolvers<never>().promise,
		haiku: () => answer(GOOD),
	});

	const fromThrow = await settle(thrown.$, SET, STATE);
	const fromHang = await settle(hung.$, SET, STATE);

	expect(fromThrow).toEqual({ done: "yes", store: "sql" });
	expect(fromHang).toEqual({ done: "yes", store: "sql" });
	expect(thrown.asked).toHaveLength(1);
	expect(hung.asked).toHaveLength(1);
});

test("a short Jev answer set hands the call to the fallback", async () => {
	const { $, asked } = rig({
		jev: () => jevReply(200, JSON.stringify({ answers: {} })),
		haiku: () => answer(GOOD),
	});

	await settle($, SET, STATE);

	expect(asked).toHaveLength(1);
});

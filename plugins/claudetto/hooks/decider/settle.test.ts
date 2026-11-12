import { expect, test } from "claude-code/testing";

import { deferred } from "../tools";
import {
	bodyOf,
	inOrder,
	jevAnswers,
	jevReply,
	KEY,
	noul,
	pick,
	rig,
	SET,
	SETTLED,
	STATE,
} from "./decider.mock";
import { settle } from "./settle";

const UNSETTLED = { done: "unsettled", store: "unsettled" };
const SETTLED_ANSWERS = { done: "yes", store: "sql" };

test("Jev settles every question: the answers come back and no model call is made", async () => {
	const { $, fetches, asked } = rig({ jev: () => jevAnswers(SETTLED) });

	expect(await settle($, SET, STATE)).toEqual(SETTLED_ANSWERS);

	expect(fetches).toHaveLength(1);
	expect(asked).toHaveLength(0);
});

test("the one request names the pinned model, holds every question, and carries the key", async () => {
	const { $, fetches } = rig({ jev: () => jevAnswers(SETTLED) });

	await settle($, SET, STATE);

	const [sent] = fetches;
	expect(sent?.url).toBe("https://api.typesafe.ai/v1/systemone");
	expect(JSON.stringify(sent?.init?.headers)).toContain(`Bearer ${KEY}`);
	expect(bodyOf(sent)).toMatchObject({
		model: "jev-1.14.0",
		state: STATE,
		questions: {
			done: { type: "noul" },
			store: { type: "choice", criteria: { sql: "relations", kv: "keys" } },
		},
	});
});

test("a Noul between its thresholds is unsettled, and a set that does not escalate makes no model call", async () => {
	const { $, asked } = rig({
		jev: () => jevAnswers({ ...SETTLED, done: noul(0.5) }),
	});

	expect(await settle($, SET, STATE)).toEqual({
		done: "unsettled",
		store: "sql",
	});

	expect(asked).toHaveLength(0);
});

test("a Noul at the upper threshold is yes", async () => {
	const { $ } = rig({ jev: () => jevAnswers({ ...SETTLED, done: noul(0.7) }) });

	const answers = await settle($, SET, STATE);

	expect(answers["done"]).toBe("yes");
});

test("a Noul at the lower threshold is no", async () => {
	const { $ } = rig({ jev: () => jevAnswers({ ...SETTLED, done: noul(0.3) }) });

	const answers = await settle($, SET, STATE);

	expect(answers["done"]).toBe("no");
});

test("a Choice below its threshold is unsettled, not the option", async () => {
	const { $ } = rig({
		jev: () => jevAnswers({ ...SETTLED, store: pick(0.6) }),
	});

	const answers = await settle($, SET, STATE);

	expect(answers["store"]).toBe("unsettled");
});

test("a question set carries its own thresholds", async () => {
	const { $ } = rig({ jev: () => jevAnswers({ ...SETTLED, done: noul(0.5) }) });

	const answers = await settle($, { ...SET, yesMin: 0.5 }, STATE);

	expect(answers["done"]).toBe("yes");
});

test("with no key no request reaches Jev", async () => {
	const { $, fetches } = rig({ env: {} });

	expect(await settle($, SET, STATE)).toEqual(UNSETTLED);

	expect(fetches).toHaveLength(0);
});

test("an answer missing for a question is no full set, so the fallback takes the call", async () => {
	const { $, logs } = rig({ jev: () => jevAnswers({ done: noul(0.9) }) });

	expect(await settle($, SET, STATE)).toEqual(UNSETTLED);

	expect(logs.join("\n")).toContain("every question");
});

test("a hung server gets one request and no second, then the fallback takes the call", async () => {
	const { $, fetches } = rig({
		jev: () => deferred<never>().promise,
	});

	expect(await settle($, SET, STATE)).toEqual(UNSETTLED);

	expect(fetches).toHaveLength(1);
});

for (const status of [429, 529, 500, 503]) {
	test(`a ${status} is tried once, logged with its status, and the next call tries Jev again`, async () => {
		const { $, fetches, logs } = rig({
			jev: inOrder(jevReply(status, "{}")),
		});

		expect(await settle($, SET, STATE)).toEqual(UNSETTLED);
		expect(logs.join("\n")).toContain(String(status));

		expect(await settle($, SET, STATE)).toEqual(SETTLED_ANSWERS);
		expect(fetches).toHaveLength(2);
	});
}

test("a request that throws is caught, its text logged, and the fallback takes the call", async () => {
	const { $, logs } = rig({
		jev: () => {
			throw new Error("connection refused");
		},
	});

	expect(await settle($, SET, STATE)).toEqual(UNSETTLED);

	expect(logs.join("\n")).toContain("connection refused");
});

test("a status no scenario names is logged and the next call tries Jev again", async () => {
	const { $, logs } = rig({
		jev: inOrder(jevReply(418, "teapot")),
	});

	expect(await settle($, SET, STATE)).toEqual(UNSETTLED);
	expect(logs.join("\n")).toContain("418");

	const again = await settle($, SET, STATE);
	expect(again["done"]).toBe("yes");
});

for (const status of [400, 413, 415, 422]) {
	test(`a ${status} leaves an error line with the status and 200 characters of the body`, async () => {
		const { $, logs } = rig({ jev: () => jevReply(status, "x".repeat(500)) });

		expect(await settle($, SET, STATE)).toEqual(UNSETTLED);

		const logged = logs.join("\n");
		expect(logged).toContain(String(status));
		expect(logged).toContain("x".repeat(200));
		expect(logged).not.toContain("x".repeat(201));
		expect(logged).not.toContain(KEY);
	});
}

for (const status of [401, 403]) {
	test(`a ${status} turns Jev off: the log names the variable and not the key, and the next call sends nothing`, async () => {
		const { $, fetches, logs } = rig({
			env: { TYPESAFE_API_KEY: `${KEY}-${status}` },
			jev: () => jevReply(status, "no"),
		});

		expect(await settle($, SET, STATE)).toEqual(UNSETTLED);
		expect(await settle($, SET, STATE)).toEqual(UNSETTLED);

		expect(fetches).toHaveLength(1);
		const logged = logs.join("\n");
		expect(logged).toContain("TYPESAFE_API_KEY");
		expect(logged).not.toContain(KEY);
	});
}

import type { On, PluginOptions } from "claude-code";
import { type Engine, expect, mock, test } from "claude-code/testing";
import { registeredTools } from "../src/blocks/__tests__/lab-support.ts";
import { ATTEMPT_TIMEOUT_MS, BACKOFF_MS } from "../src/blocks/decide/limits.ts";

const DECIDE = "mcp__claudetto__decide";

const KEY = "typesafe-key";

const answers = (confidence: number, approval = 0.05) => ({
	pick_0: {
		type: "choice",
		choice: "sql",
		confidence,
		probabilities: { sql: 0.9, kv: 0.1 },
	},
	approval_0: { type: "noul", noul: approval },
});

const reply = (status: number, body: unknown = {}) => ({
	value: {
		status,
		ok: status >= 200 && status < 300,
		headers: {},
		text: JSON.stringify(body),
	},
});

const okay = (body: object) =>
	reply(200, { model: "jev-latest", answers: body });

const option = (decide: string): { options: PluginOptions } => ({
	options: { decide },
});

const STORE = {
	question: "Which store?",
	options: [
		{ label: "sql", description: "relations" },
		{ label: "kv", description: "keys" },
	],
};

type Send = (
	n: number,
	clock: ReturnType<typeof mock.clock>,
) => ReturnType<typeof reply> | Promise<ReturnType<typeof reply>>;

const stub = (
	on: On,
	key: string,
	body: object = answers(0.9),
	send: Send = () => okay(body),
) => {
	mock.env(on, { TYPESAFE_API_KEY: key });
	const clock = mock.clock(on);
	const fetches: {
		url: string;
		init?: { headers?: Record<string, string>; body?: string };
	}[] = [];
	const asks: unknown[] = [];
	on("http.fetch", (_$, e) => {
		fetches.push(e);
		return send(fetches.length, clock);
	});
	on("tool.call", (_$, e, next) => {
		if (e.tool !== "AskUserQuestion") {
			return next(e);
		}
		asks.push(e);
		return { result: "ok" };
	});
	return { fetches, asks, clock };
};

const callDecide = async ($: Engine, questions: object[] = [STORE]) => {
	const answer = await $.tool.call({ tool: DECIDE, questions });
	return typeof answer.result === "string" ? answer.result : "";
};

const declared = async ($: Engine, on: On, key: string) => {
	mock.env(on, { TYPESAFE_API_KEY: key });
	const names = await registeredTools($, on);
	// Other blocks register their own tools, such as `setup`.
	return names.filter((name) => name === "decide");
};

test(
	"with the option `jev` and a key, `session.start` registers the `decide` tool",
	option("jev"),
	async ($: Engine, on: On) => {
		const names = await declared($, on, KEY);

		expect(names).toEqual(["decide"]);
	},
);

test(
	"with the option `jev` and no key, `session.start` registers no tool",
	option("jev"),
	async ($: Engine, on: On) => {
		const names = await declared($, on, "");

		expect(names).toEqual([]);
	},
);

test(
	"with the option off and a key, `session.start` registers no tool",
	option("off"),
	async ($: Engine, on: On) => {
		const names = await declared($, on, KEY);

		expect(names).toEqual([]);
	},
);

/** `AskUserQuestion` input needs a `header` and a `multiSelect`. */
const DIALOG = { ...STORE, header: "Store", multiSelect: false };

test(
	"an `AskUserQuestion` call reaches the user as sent, and nothing goes to the API",
	option("jev"),
	async ($: Engine, on: On) => {
		const { asks, fetches } = stub(on, KEY);

		await $.tool.call({ tool: "AskUserQuestion", questions: [DIALOG] });

		expect(fetches).toEqual([]);
		expect(asks).toMatchObject([{ questions: [DIALOG] }]);
	},
);

test(
	"a call of the tool sends one request and names the pick with its confidence",
	option("jev"),
	async ($: Engine, on: On) => {
		const { fetches } = stub(on, KEY);

		const text = await callDecide($);

		expect(fetches).toHaveLength(1);
		expect(fetches[0]?.url).toBe("https://api.typesafe.ai/v1/systemone");
		expect(text).toContain("sql");
		expect(text).toContain("0.90");
	},
);

test(
	"many questions go in one request",
	option("jev"),
	async ($: Engine, on: On) => {
		const { fetches } = stub(on, KEY);
		const color = { ...STORE, question: "Which color?" };

		await callDecide($, [STORE, color]);

		const body = JSON.parse(fetches[0]?.init?.body ?? "{}");
		expect(fetches).toHaveLength(1);
		expect(Object.keys(body.questions)).toEqual([
			"pick_0",
			"approval_0",
			"pick_1",
			"approval_1",
		]);
	},
);

test(
	"the key goes in the header and in no body",
	option("jev"),
	async ($: Engine, on: On) => {
		const { fetches } = stub(on, KEY);

		await callDecide($);

		expect(fetches[0]?.init?.headers?.["authorization"]).toBe(`Bearer ${KEY}`);
		expect(fetches[0]?.init?.body).not.toContain(KEY);
	},
);

test(
	"a pick under the floor gives no pick, and the reply names the question",
	option("jev"),
	async ($: Engine, on: On) => {
		stub(on, KEY, answers(0.49));

		const text = await callDecide($);

		expect(text).toContain("Which store?");
		expect(text).not.toContain("sql");
	},
);

test(
	"an approval question that Jev answers yes gives no pick",
	option("jev"),
	async ($: Engine, on: On) => {
		stub(on, KEY, answers(0.95, 0.95));

		const text = await callDecide($);

		expect(text).not.toContain("sql");
	},
);

test(
	"a call with no `questions` list sends nothing and answers no text",
	option("jev"),
	async ($: Engine, on: On) => {
		const { fetches } = stub(on, KEY);

		const answer = await $.tool
			.call({ tool: DECIDE, question: "Which store?" })
			.catch(() => ({ result: undefined }));

		expect(fetches).toEqual([]);
		expect(typeof answer.result).not.toBe("string");
	},
);

test(
	"a try over `ATTEMPT_TIMEOUT_MS` ends with no retry and no pick",
	option("jev"),
	async ($: Engine, on: On) => {
		const { fetches, clock } = stub(on, KEY, answers(0.9), async (_n, c) => {
			await c.sleep(ATTEMPT_TIMEOUT_MS * 5);
			return okay(answers(0.9));
		});
		const pending = callDecide($);

		await clock.settle();
		await clock.advance(ATTEMPT_TIMEOUT_MS);

		expect(await pending).not.toContain("sql");
		expect(fetches).toHaveLength(1);
	},
);

test(
	"a 429 and then a 529 wait `BACKOFF_MS` and twice that, and the third try answers",
	option("jev"),
	async ($: Engine, on: On) => {
		const { fetches, clock } = stub(on, KEY, answers(0.9), (n) => {
			if (n === 1) {
				return reply(429);
			}
			return n === 2 ? reply(529) : okay(answers(0.9));
		});
		const pending = callDecide($);

		await clock.settle();
		expect(fetches).toHaveLength(1);
		await clock.advance(BACKOFF_MS);
		expect(fetches).toHaveLength(2);
		await clock.advance(BACKOFF_MS * 2);

		expect(await pending).toContain("sql");
		expect(fetches).toHaveLength(3);
	},
);

test(
	"a 401 is not retried, and the key is in no answer",
	option("jev"),
	async ($: Engine, on: On) => {
		const { fetches } = stub(on, KEY, answers(0.9), () =>
			reply(401, { detail: "bad" }),
		);

		const text = await callDecide($);

		expect(fetches).toHaveLength(1);
		expect(text).not.toContain(KEY);
		expect(text).not.toContain("sql");
	},
);

test(
	"the key of the option turns the tool on with no env variable",
	{ options: { decide: "jev", TYPESAFE_API_KEY: "secure-key" } },
	async ($: Engine, on: On) => {
		const { fetches } = stub(on, "");

		await callDecide($);

		expect(fetches.map((f) => f.init?.headers?.["authorization"])).toEqual([
			"Bearer secure-key",
		]);
	},
);

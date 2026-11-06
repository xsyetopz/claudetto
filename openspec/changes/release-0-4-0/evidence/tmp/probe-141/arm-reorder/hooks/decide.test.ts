import type { On, PluginOptions } from "claude-code";
import { type Engine, expect, mock, test } from "claude-code/testing";
import { scanner } from "./secrets.mock.ts";

const DECIDE = "mcp__claudetto__decide";
const KEY = "typesafe-key";
const WITH_KEY: { options: PluginOptions } = {
	options: { typesafeApiKey: KEY },
};

const reply = (status: number, text: string) => ({
	value: { status, ok: status >= 200 && status < 300, headers: {}, text },
});

const okay = (answers: object) =>
	reply(200, JSON.stringify({ model: "jev-1", answers }));

const choice = (
	top: number,
	rest: Record<string, number>,
	approval = 0.05,
) => ({
	pick_0: {
		type: "choice",
		choice: "sql",
		confidence: 0.1,
		probabilities: { sql: top, ...rest },
	},
	approval_0: { type: "noul", noul: approval },
});

const opt = (label: string) => ({ label, description: `the ${label} option` });
const TWO = { question: "Which store?", options: [opt("sql"), opt("kv")] };
const FOUR = {
	question: "Which store?",
	options: [opt("sql"), opt("kv"), opt("graph"), opt("doc")],
};

type Reply = ReturnType<typeof reply>;
type Send = (
	n: number,
	clock: ReturnType<typeof mock.clock>,
) => Reply | Promise<Reply>;

const stub = (on: On, send: Send) => {
	scanner(on);
	const clock = mock.clock(on);
	const fetches: {
		url: string;
		init?: { headers?: Record<string, string>; body?: string };
	}[] = [];
	on("http.fetch", (_$, e) => {
		fetches.push(e);
		return send(fetches.length, clock);
	});
	on("tool.call", (_$, e, next) =>
		e.tool === DECIDE ? next(e) : { result: "ran" },
	);
	return { fetches, clock };
};

const ask = async ($: Engine, questions: object[]) => {
	const answer = await $.tool.call({ tool: DECIDE, questions });
	return typeof answer.result === "string" ? answer.result : "";
};

const registered = async ($: Engine, on: On) => {
	const names: string[] = [];
	on("session.start", () => ({ cwd: "/repo" }));
	on("tool.register", (_$, e) => {
		names.push(e.name);
		return { value: { tool: `mcp__claudetto__${e.name}` } };
	});
	await $.session.start({ cwd: "/repo", surface: null, isInteractive: false });
	return names.filter((name) => name === "decide");
};

test("No Key: no tool is registered and no request goes out", async ($: Engine, on: On) => {
	const { fetches } = stub(on, () => okay({}));

	expect(await registered($, on)).toEqual([]);
	expect(fetches).toEqual([]);
});

test(
	"With a key the tool is registered",
	WITH_KEY,
	async ($: Engine, on: On) => {
		stub(on, () => okay({}));

		expect(await registered($, on)).toEqual(["decide"]);
	},
);

test(
	"A Gated Tool Call: Bash and Edit send nothing",
	WITH_KEY,
	async ($: Engine, on: On) => {
		const { fetches } = stub(on, () => okay({}));

		await $.tool.call({ tool: "Bash", command: "ls" });
		await $.tool.call({
			tool: "Edit",
			file_path: "/p/a",
			old_string: "a",
			new_string: "b",
		});

		expect(fetches).toEqual([]);
	},
);

test(
	"What a Request Holds: the key only in the header, texts only in the body",
	WITH_KEY,
	async ($: Engine, on: On) => {
		const { fetches } = stub(on, () => okay(choice(0.9, { kv: 0.1 })));

		await ask($, [TWO]);

		const body = JSON.parse(fetches[0]?.init?.body ?? "{}");
		expect(fetches).toHaveLength(1);
		expect(fetches[0]?.url).toBe("https://api.typesafe.ai/v1/systemone");
		expect(fetches[0]?.init?.headers?.["authorization"]).toBe(`Bearer ${KEY}`);
		expect(Object.keys(body).sort((a, b) => a.localeCompare(b))).toEqual([
			"model",
			"questions",
			"state",
		]);
		expect(body.state).toEqual({
			question_0: {
				question: "Which store?",
				options: { sql: "the sql option", kv: "the kv option" },
			},
		});
		expect(Object.keys(body.questions)).toEqual(["pick_0", "approval_0"]);
		expect(fetches[0]?.init?.body).not.toContain(KEY);
	},
);

test(
	"Four Options With a Weak Top Choice is handed back",
	WITH_KEY,
	async ($: Engine, on: On) => {
		stub(on, () =>
			okay({
				...choice(0.61, { kv: 0.37, graph: 0.02, doc: 0 }),
				pick_0: {
					type: "choice",
					choice: "sql",
					confidence: 0.48,
					probabilities: { sql: 0.61, kv: 0.37, graph: 0.02, doc: 0 },
				},
			}),
		);

		const text = await ask($, [FOUR]);

		expect(text).toContain("Which store?");
		expect(text).not.toContain("picks");
	},
);

test(
	"Two Options: a pick at 0.75 is returned",
	WITH_KEY,
	async ($: Engine, on: On) => {
		stub(on, () => okay(choice(0.75, { kv: 0.25 }, 0.19)));

		const text = await ask($, [TWO]);

		expect(text).toContain("picks `sql`");
		expect(text).toContain("0.75");
	},
);

test(
	"A Risky Approval is handed back whatever the pick",
	WITH_KEY,
	async ($: Engine, on: On) => {
		stub(on, () => okay(choice(0.99, { kv: 0.01 }, 0.94)));

		expect(await ask($, [TWO])).not.toContain("picks");
	},
);

test(
	"Multi-Select is handed back with no request",
	WITH_KEY,
	async ($: Engine, on: On) => {
		const { fetches } = stub(on, () => okay({}));

		const text = await ask($, [{ ...TWO, multiSelect: true }]);

		expect(fetches).toEqual([]);
		expect(text).toContain("no question can be asked");
	},
);

test(
	"A yes/no question is answered at P(yes) 0.7 or more",
	WITH_KEY,
	async ($: Engine, on: On) => {
		const { fetches } = stub(on, () =>
			okay({
				yes_0: { type: "noul", noul: 0.93 },
				approval_0: { type: "noul", noul: 0.02 },
			}),
		);

		const text = await ask($, [{ question: "Is the cache stale?" }]);

		const body = JSON.parse(fetches[0]?.init?.body ?? "{}");
		expect(Object.keys(body.questions)).toEqual(["yes_0", "approval_0"]);
		expect(text).toContain("answers yes");
	},
);

test(
	"A yes/no in the middle band is handed back",
	WITH_KEY,
	async ($: Engine, on: On) => {
		stub(on, () =>
			okay({
				yes_0: { type: "noul", noul: 0.5 },
				approval_0: { type: "noul", noul: 0.02 },
			}),
		);

		expect(await ask($, [{ question: "Is the cache stale?" }])).not.toContain(
			"answers",
		);
	},
);

test(
	"A Hung Server: one try of 5 s, then handed back",
	WITH_KEY,
	async ($: Engine, on: On) => {
		const { fetches, clock } = stub(on, async (_n, c) => {
			await c.sleep(30_000);
			return okay(choice(0.9, { kv: 0.1 }));
		});
		const pending = ask($, [TWO]);

		await clock.settle();
		await clock.advance(5000);

		expect(await pending).not.toContain("picks");
		expect(fetches).toHaveLength(1);
	},
);

test(
	"Slow Overload Replies: 3 tries and 3 s of backoff end within 18 s",
	WITH_KEY,
	async ($: Engine, on: On) => {
		const { fetches, clock } = stub(on, async (n, c) => {
			if (n < 3) {
				await c.sleep(4900);
				return reply(529, "{}");
			}
			await c.sleep(60_000);
			return okay({});
		});
		let done = false;
		const pending = (async () => {
			const text = await ask($, [TWO]);
			done = true;
			return text;
		})();

		await clock.settle();
		await clock.advance(4900);
		await clock.advance(1000);
		expect(fetches).toHaveLength(2);
		await clock.advance(4900);
		await clock.advance(2000);
		expect(fetches).toHaveLength(3);
		await clock.advance(4999);
		expect(done).toBe(false);
		await clock.advance(1);

		expect(await pending).not.toContain("picks");
		expect(fetches).toHaveLength(3);
	},
);

test(
	"A 400 or 422 is tried once and the reply holds the status and 200 characters",
	WITH_KEY,
	async ($: Engine, on: On) => {
		const { fetches } = stub(on, () => reply(422, "x".repeat(500)));

		const text = await ask($, [TWO]);

		expect(fetches).toHaveLength(1);
		expect(text).toContain("422");
		expect(text).toContain("x".repeat(200));
		expect(text).not.toContain("x".repeat(201));
		expect(text).not.toContain(KEY);
	},
);

test(
	"An AskUserQuestion call reaches the user as sent and nothing goes to the API",
	WITH_KEY,
	async ($: Engine, on: On) => {
		const { fetches } = stub(on, () => okay({}));

		await $.tool.call({
			tool: "AskUserQuestion",
			questions: [{ ...TWO, header: "Store", multiSelect: false }],
		});

		expect(fetches).toEqual([]);
	},
);

test(
	"Many questions go in one request, each keyed by its index",
	WITH_KEY,
	async ($: Engine, on: On) => {
		const { fetches } = stub(on, () => okay({}));

		await ask($, [TWO, FOUR]);

		const body = JSON.parse(fetches[0]?.init?.body ?? "{}");
		expect(fetches).toHaveLength(1);
		expect(Object.keys(body.state)).toEqual(["question_0", "question_1"]);
	},
);

test(
	"A call with an empty questions list sends nothing",
	WITH_KEY,
	async ($: Engine, on: On) => {
		const { fetches } = stub(on, () => okay({}));

		const out = await $.tool
			.call({ tool: DECIDE, questions: [] })
			.catch(() => "passed on");

		expect(fetches).toEqual([]);
		expect(out).toBe("passed on");
	},
);

test(
	"A 429 and then a 529 wait 1 s and 2 s, and the third try answers",
	WITH_KEY,
	async ($: Engine, on: On) => {
		const overloads = [reply(429, "{}"), reply(529, "{}")];
		const { fetches, clock } = stub(
			on,
			(n) => overloads[n - 1] ?? okay(choice(0.9, { kv: 0.1 })),
		);
		const pending = ask($, [TWO]);

		await clock.settle();
		expect(fetches).toHaveLength(1);
		await clock.advance(999);
		expect(fetches).toHaveLength(1);
		await clock.advance(1);
		expect(fetches).toHaveLength(2);
		await clock.advance(1999);
		expect(fetches).toHaveLength(2);
		await clock.advance(1);

		expect(await pending).toContain("picks `sql`");
		expect(fetches).toHaveLength(3);
	},
);

test(
	"A 401 is not retried and the key is in no answer",
	WITH_KEY,
	async ($: Engine, on: On) => {
		const { fetches } = stub(on, () => reply(401, `bad key ${KEY}`));

		const text = await ask($, [TWO]);

		expect(fetches).toHaveLength(1);
		expect(text).toContain("401");
		expect(text).not.toContain("picks");
	},
);

test(
	"A yes/no at P(yes) 0.7 answers yes and at 0.3 answers no, and between them goes back",
	WITH_KEY,
	async ($: Engine, on: On) => {
		let yesP = 0.7;
		stub(on, () =>
			okay({
				yes_0: { type: "noul", noul: yesP },
				approval_0: { type: "noul", noul: 0.19 },
			}),
		);
		const yes = await ask($, [{ question: "Is it stale?" }]);
		yesP = 0.3;
		const no = await ask($, [{ question: "Is it stale?" }]);
		yesP = 0.31;
		const between = await ask($, [{ question: "Is it stale?" }]);

		expect(yes).toContain("answers yes");
		expect(no).toContain("answers no");
		expect(between).not.toContain("answers");
	},
);

test(
	"A pick at 0.75 passes and at 0.74 goes back, and an approval at 0.2 goes back",
	WITH_KEY,
	async ($: Engine, on: On) => {
		let top = 0.75;
		let approval = 0.19;
		stub(on, () => okay(choice(top, { kv: 1 - top }, approval)));

		const at = await ask($, [TWO]);
		top = 0.74;
		const under = await ask($, [TWO]);
		top = 0.75;
		approval = 0.2;
		const risky = await ask($, [TWO]);

		expect(at).toContain("picks `sql`");
		expect(under).not.toContain("picks");
		expect(risky).not.toContain("picks");
	},
);

import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

import {
	ask,
	bodyKeys,
	choice,
	DECIDE,
	FOUR,
	KEY,
	okay,
	registered,
	sectionKeys,
	sectionOf,
	stub,
	TWO,
	WITH_KEY,
} from "./decide.mock.ts";
import { replyOf } from "./decide/judge.ts";

const YES_NO = { question: "Is the cache stale?" };
const PICK_SQL = { kind: "pick", choice: "sql", p: 0.75 } as const;

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

		expect(fetches).toHaveLength(1);
		expect(fetches[0]?.url).toBe("https://api.typesafe.ai/v1/systemone");
		expect(fetches[0]?.init?.headers?.["authorization"]).toBe(`Bearer ${KEY}`);
		expect(bodyKeys(fetches[0])).toEqual(["model", "questions", "state"]);
		expect(sectionOf(fetches[0], "state")).toEqual({
			question_0: {
				question: "Which store?",
				options: { sql: "the sql option", kv: "the kv option" },
			},
		});
		expect(sectionKeys(fetches[0], "questions")).toEqual([
			"pick_0",
			"approval_0",
		]);
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

		expect(text).toBe(replyOf([FOUR], [undefined]));
	},
);

test(
	"Two Options: a pick at 0.75 is returned",
	WITH_KEY,
	async ($: Engine, on: On) => {
		stub(on, () => okay(choice(0.75, { kv: 0.25 }, 0.19)));

		const text = await ask($, [TWO]);

		expect(text).toBe(replyOf([TWO], [PICK_SQL]));
	},
);

test(
	"A Risky Approval is handed back whatever the pick",
	WITH_KEY,
	async ($: Engine, on: On) => {
		stub(on, () => okay(choice(0.99, { kv: 0.01 }, 0.94)));

		expect(await ask($, [TWO])).toBe(replyOf([TWO], [undefined]));
	},
);

test(
	"Multi-Select is handed back with no request",
	WITH_KEY,
	async ($: Engine, on: On) => {
		const { fetches } = stub(on, () => okay({}));

		await ask($, [{ ...TWO, multiSelect: true }]);

		expect(fetches).toEqual([]);
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

		const text = await ask($, [YES_NO]);

		expect(sectionKeys(fetches[0], "questions")).toEqual([
			"yes_0",
			"approval_0",
		]);
		expect(text).toBe(replyOf([YES_NO], [{ kind: "yes", p: 0.93 }]));
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

		expect(await ask($, [YES_NO])).toBe(replyOf([YES_NO], [undefined]));
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

		expect(fetches).toHaveLength(1);
		expect(sectionKeys(fetches[0], "state")).toEqual([
			"question_0",
			"question_1",
		]);
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

		const stale = { question: "Is it stale?" };
		expect(yes).toBe(replyOf([stale], [{ kind: "yes", p: 0.7 }]));
		expect(no).toBe(replyOf([stale], [{ kind: "no", p: 1 - 0.3 }]));
		expect(between).toBe(replyOf([stale], [undefined]));
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

		expect(at).toBe(replyOf([TWO], [PICK_SQL]));
		expect(under).toBe(replyOf([TWO], [undefined]));
		expect(risky).toBe(replyOf([TWO], [undefined]));
	},
);

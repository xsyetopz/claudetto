import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

import {
	ask,
	choice,
	KEY,
	okay,
	repliesThenPick,
	reply,
	slowOverloads,
	stub,
	TWO,
} from "./decide.mock.ts";
import { replyOf } from "./decide/judge.ts";
import { JEV_GIVE_BACK } from "./texts-gate.ts";

test("A Hung Server: one try of 5 s, then handed back", async ($: Engine, on: On) => {
	const { fetches, clock } = stub(on, async (_n, c) => {
		await c.sleep(30_000);
		return okay(choice(0.9, { kv: 0.1 }));
	});
	const pending = ask($, [TWO]);

	await clock.settle();
	await clock.advance(5000);

	expect(await pending).toContain(JEV_GIVE_BACK);
	expect(fetches).toHaveLength(1);
});

test("Slow Overload Replies: 3 tries and 3 s of backoff end within 18 s", async ($: Engine, on: On) => {
	const { fetches, clock } = stub(on, slowOverloads);
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

	expect(await pending).toContain(JEV_GIVE_BACK);
	expect(fetches).toHaveLength(3);
});

test("A 400 or 422 is tried once and the reply holds the status and 200 characters", async ($: Engine, on: On) => {
	const { fetches } = stub(on, () => reply(422, "x".repeat(500)));

	const text = await ask($, [TWO]);

	expect(fetches).toHaveLength(1);
	expect(text).toContain("422");
	expect(text).toContain("x".repeat(200));
	expect(text).not.toContain("x".repeat(201));
	expect(text).not.toContain(KEY);
});

test("A 429 and then a 529 wait 1 s and 2 s, and the third try answers", async ($: Engine, on: On) => {
	const { fetches, clock } = stub(
		on,
		repliesThenPick([reply(429, "{}"), reply(529, "{}")]),
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

	expect(await pending).toBe(
		replyOf([TWO], [{ kind: "pick", choice: "sql", p: 0.9 }]),
	);
	expect(fetches).toHaveLength(3);
});

test("A 401 is not retried and the key is in no answer", async ($: Engine, on: On) => {
	const { fetches } = stub(on, () => reply(401, `bad key ${KEY}`));

	const text = await ask($, [TWO]);

	expect(fetches).toHaveLength(1);
	expect(text).toContain("401");
	expect(text).toContain(JEV_GIVE_BACK);
});

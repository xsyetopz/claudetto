import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";
import { OWN } from "../src/constants.ts";
import { lab, steps, TURNED_ON, typed } from "./lab-kit.ts";

const runCheck = async ($: Engine, on: On) => {
	const l = lab(on);
	await steps($, l, "t1", { from: 1, to: 6 });
	return l;
};

test(
	"a check makes exactly one request, with the model, the effort, and the bound named",
	{ options: TURNED_ON },
	async ($: Engine, on: On) => {
		const l = await runCheck($, on);

		expect(l.asked).toHaveLength(1);
		expect(l.asked[0]?.model).toBe("claude-haiku-5-5");
		expect(l.asked[0]?.effort).toBe("high");
		expect(l.asked[0]?.maxTokens).toBe(OWN.MAX_TOKENS);
	},
);

test(
	"the fixed instructions are the cached block and the digest follows unmarked",
	{ options: TURNED_ON },
	async ($: Engine, on: On) => {
		const l = await runCheck($, on);

		const blocks = l.asked[0]?.promptBlocks ?? [];
		expect(blocks).toHaveLength(2);
		expect(blocks[0]?.cache).toBe(true);
		expect(blocks[1]?.cache).toBeUndefined();
	},
);

test(
	"the model and the effort come from the options of the plugin",
	{ options: { enabled: true, model: "claude-sonnet-5-5", effort: "low" } },
	async ($: Engine, on: On) => {
		const l = await runCheck($, on);

		expect(l.asked[0]?.model).toBe("claude-sonnet-5-5");
		expect(l.asked[0]?.effort).toBe("low");
	},
);

test(
	"an effort outside the five levels falls back to the default",
	{ options: { enabled: true, effort: "maximum" } },
	async ($: Engine, on: On) => {
		const l = await runCheck($, on);

		expect(l.asked[0]?.effort).toBe("high");
	},
);

test(
	"a long prompt sends a digest no longer than the bound, not the window",
	{ options: TURNED_ON },
	async ($: Engine, on: On) => {
		const l = lab(on);
		await typed($, "x".repeat(50_000));

		await steps($, l, "t1", { from: 1, to: 6 });

		const digestBlock = l.asked[0]?.promptBlocks?.[1]?.text ?? "";
		expect(digestBlock.length).toBeLessThan(OWN.MAX_DIGEST_CHARS + 200);
	},
);

test(
	"a reply of none opens no offer, so the band has nothing to draw",
	{ options: TURNED_ON },
	async ($: Engine, on: On) => {
		const l = lab(on);
		l.reply("learn: none");

		await steps($, l, "t1", { from: 1, to: 6 });

		expect(l.asked).toHaveLength(1);
		expect(l.store.get("sessions")).toMatchObject([{ view: null }]);
	},
);

// `model.fork` gets an answer: a missing one throws into the check's catch, so the ban passes vacuously.
test(
	"a check never forks the session, so the conversation is not copied into the request",
	{ options: TURNED_ON },
	async ($: Engine, on: On) => {
		const l = lab(on);
		const forks: unknown[] = [];
		on("model.fork", (_$, e) => {
			forks.push(e);
			return { deny: "this plugin does not fork the session" };
		});

		await steps($, l, "t1", { from: 1, to: 6 });

		expect(l.asked).toHaveLength(1);
		expect(forks).toEqual([]);
	},
);

test("a plugin left off makes no request and touches no store key", async ($: Engine, on: On) => {
	const l = lab(on);
	await typed($, "build the export");

	await steps($, l, "t1", { from: 0, to: 12 });

	expect(l.asked).toHaveLength(0);
	expect(l.store.size).toBe(0);
});

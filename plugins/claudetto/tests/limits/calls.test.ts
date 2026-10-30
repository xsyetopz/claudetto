// Cap Calls at Heavy Context (`specs/run-limits/spec.md`): once the context is heavy, the calls of
// one period are capped, and the call past the cap is held at `tool.check` with one line that gives
// the reason. Below the heavy line nothing is counted. The stub of `session.usage` stands for the
// engine's reading of the fill.
//
// The calls are `WebFetch`, whose input holds no key the gate reads, so the case stays on the cap.

import type { On, PluginOptions } from "claude-code";
import { type Engine, expect, mock, test } from "claude-code/testing";

const HEAVY = 450_000;

const LIGHT = 100_000;

const usage = (tokens: number) => ({
	startedAt: 0,
	context: { tokens, window: 1_000_000, percent: 0 },
	rateLimits: [],
});

const lab = (on: On, tokens: number) => {
	const clock = mock.clock(on, { now: 0 });
	on("session.usage", () => ({ value: usage(tokens) }));
	on("tool.check", () => ({ decision: "allow" }));
	return clock;
};

let sent = 0;

const call = ($: Engine) => {
	sent += 1;
	return $.tool.check({
		tool: "WebFetch",
		input: { url: `https://example.com/${sent}`, prompt: "go" },
		tool_use_id: `call-${sent}`,
	});
};

const options = (set: PluginOptions): { options: PluginOptions } => ({
	options: set,
});

test(
	"the call past the cap at heavy context is held with one line that gives the cap",
	options({ callCap: 2 }),
	async ($: Engine, on: On) => {
		lab(on, HEAVY);
		await call($);
		await call($);

		const held = await call($);

		expect(held.decision).toBe("deny");
		expect(held.reason).toContain("2");
		expect(held.reason).toContain("callCap");
		expect(held.reason?.split("\n")).toHaveLength(1);
	},
);

test(
	"the calls under the cap at heavy context go through",
	options({ callCap: 2 }),
	async ($: Engine, on: On) => {
		lab(on, HEAVY);
		await call($);

		const out = await call($);

		expect(out.decision).toBe("allow");
	},
);

test(
	"a light context is never capped",
	options({ callCap: 2 }),
	async ($: Engine, on: On) => {
		lab(on, LIGHT);
		await call($);
		await call($);

		const out = await call($);

		expect(out.decision).toBe("allow");
	},
);

test(
	"a context that falls back below the heavy line starts the count again",
	options({ callCap: 2 }),
	async ($: Engine, on: On) => {
		let tokens = HEAVY;
		mock.clock(on, { now: 0 });
		on("session.usage", () => ({ value: usage(tokens) }));
		on("tool.check", () => ({ decision: "allow" }));
		await call($);
		await call($);
		tokens = LIGHT;
		await call($);
		tokens = HEAVY;

		const out = await call($);

		expect(out.decision).toBe("allow");
	},
);

test(
	"a call after the period has passed is counted from zero",
	options({ callCap: 2, windowSeconds: 60 }),
	async ($: Engine, on: On) => {
		const clock = lab(on, HEAVY);
		await call($);
		await call($);
		await clock.advance(61_000);

		const out = await call($);

		expect(out.decision).toBe("allow");
	},
);

test(
	"a heavy-context threshold from the options replaces the default",
	options({ callCap: 1, heavyTokens: 50_000 }),
	async ($: Engine, on: On) => {
		lab(on, LIGHT);
		await call($);

		const out = await call($);

		expect(out.decision).toBe("deny");
	},
);

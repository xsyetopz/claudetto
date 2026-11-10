import type { On } from "claude-code";
import { type Engine, expect, mock, test } from "claude-code/testing";

import { set, usage } from "./hold.mock.ts";

const ERROR = "connect ECONNREFUSED 127.0.0.1:9";

const SAME = { url: "https://example.com/a", prompt: "go" };

const lab = (on: On, tokens = 100_000) => {
	const clock = mock.clock(on, { now: 0 });
	on("session.usage", () => ({ value: usage(tokens) }));
	on("classic.PostToolUseFailure", () => ({}));
	on("tool.check", () => ({ decision: "allow" }));
	return clock;
};

const failed = (
	$: Engine,
	input: Record<string, unknown> = SAME,
	error = ERROR,
) =>
	$.classic.PostToolUseFailure({
		tool_name: "WebFetch",
		tool_input: input,
		tool_use_id: crypto.randomUUID(),
		error,
	});

const check = ($: Engine, input: Record<string, unknown> = SAME) =>
	$.tool.check({ tool: "WebFetch", input, tool_use_id: crypto.randomUUID() });

test(
	"an identical call is refused after the failure limit, with the earlier error",
	set({ maxIdenticalFailures: 2 }),
	async ($: Engine, on: On) => {
		lab(on);
		await failed($);
		await failed($);

		const out = await check($);

		expect(out.decision).toBe("deny");
		expect(out.reason).toContain(ERROR);
		expect(out.reason).toContain("maxIdenticalFailures");
	},
);

test(
	"a call under the failure limit, or with other input, goes through",
	set({ maxIdenticalFailures: 2 }),
	async ($: Engine, on: On) => {
		lab(on);
		await failed($);
		await failed($);

		const other = await check($, {
			url: "https://example.com/b",
			prompt: "go",
		});
		await failed($, { url: "https://example.com/c", prompt: "go" });
		const once = await check($, { url: "https://example.com/c", prompt: "go" });

		expect(other.decision).toBe("allow");
		expect(once.decision).toBe("allow");
	},
);

test(
	"a failure after the period passes",
	set({ maxIdenticalFailures: 2, limitPeriodSeconds: 60 }),
	async ($: Engine, on: On) => {
		const clock = lab(on);
		await failed($);
		await failed($);
		await clock.advance(61_000);

		const out = await check($);

		expect(out.decision).toBe("allow");
	},
);

test(
	"a user's interrupt is not counted as a failure",
	set({ maxIdenticalFailures: 1 }),
	async ($: Engine, on: On) => {
		lab(on);
		await $.classic.PostToolUseFailure({
			tool_name: "WebFetch",
			tool_input: SAME,
			tool_use_id: "i1",
			error: "interrupted",
			is_interrupt: true,
		});

		const out = await check($);

		expect(out.decision).toBe("allow");
	},
);

test(
	"a query without a tool_use_id is never held",
	set({ maxIdenticalFailures: 1 }),
	async ($: Engine, on: On) => {
		lab(on);
		await failed($);

		const out = await $.tool.check({ tool: "WebFetch", input: SAME });

		expect(out.decision).toBe("allow");
	},
);

test(
	"the call past the cap at heavy context is held with the cap named and one line that gives the count",
	set({ maxHeavyToolCalls: 2 }),
	async ($: Engine, on: On) => {
		lab(on, 450_000);
		await check($, { n: 1 });
		await check($, { n: 2 });

		const held = await check($, { n: 3 });

		expect(held.decision).toBe("deny");
		expect(held.reason).toContain("maxHeavyToolCalls");
		expect(held.reason).toContain("2");
		expect(held.reason?.split("\n")).toHaveLength(1);
	},
);

test(
	"a light context is never capped",
	set({ maxHeavyToolCalls: 1 }),
	async ($: Engine, on: On) => {
		lab(on, 100_000);
		await check($, { n: 1 });

		const out = await check($, { n: 2 });

		expect(out.decision).toBe("allow");
	},
);

test(
	"failures with different errors do not add up",
	set({ maxIdenticalFailures: 2 }),
	async ($: Engine, on: On) => {
		lab(on);
		await failed($, SAME, "first error");
		await failed($, SAME, "second error");

		const out = await check($);

		expect(out.decision).toBe("allow");
	},
);

test("with no option the failure limit is 3", async ($: Engine, on: On) => {
	lab(on);
	await failed($);
	await failed($);
	const beforeThird = await check($);
	await failed($);

	const afterThird = await check($);

	expect(beforeThird.decision).toBe("allow");
	expect(afterThird.decision).toBe("deny");
});

test(
	"the calls under the cap at heavy context go through",
	set({ maxHeavyToolCalls: 2 }),
	async ($: Engine, on: On) => {
		lab(on, 450_000);
		await check($, { n: 1 });

		const out = await check($, { n: 2 });

		expect(out.decision).toBe("allow");
	},
);

test(
	"a context that falls back below the heavy line starts the count again",
	set({ maxHeavyToolCalls: 2 }),
	async ($: Engine, on: On) => {
		let tokens = 450_000;
		mock.clock(on, { now: 0 });
		on("session.usage", () => ({ value: usage(tokens) }));
		on("tool.check", () => ({ decision: "allow" }));
		await check($, { n: 1 });
		await check($, { n: 2 });
		tokens = 100_000;
		await check($, { n: 3 });
		tokens = 450_000;

		const out = await check($, { n: 4 });

		expect(out.decision).toBe("allow");
	},
);

test(
	"a call after the period has passed is counted from zero",
	set({ maxHeavyToolCalls: 2, limitPeriodSeconds: 60 }),
	async ($: Engine, on: On) => {
		const clock = lab(on, 450_000);
		await check($, { n: 1 });
		await check($, { n: 2 });
		await clock.advance(61_000);

		const out = await check($, { n: 3 });

		expect(out.decision).toBe("allow");
	},
);

test(
	"a heavy-context threshold from the options replaces the default",
	set({ maxHeavyToolCalls: 1, heavyContextTokens: 50_000 }),
	async ($: Engine, on: On) => {
		lab(on, 100_000);
		await check($, { n: 1 });

		const out = await check($, { n: 2 });

		expect(out.decision).toBe("deny");
	},
);

test(
	"a context reading that fails holds nothing",
	set({ maxHeavyToolCalls: 1 }),
	async ($: Engine, on: On) => {
		mock.clock(on, { now: 0 });
		on("session.usage", () => {
			throw new Error("no reading");
		});
		on("classic.PostToolUseFailure", () => ({}));
		on("tool.check", () => ({ decision: "allow" }));
		await check($, { n: 1 });

		const out = await check($, { n: 2 });

		expect(out.decision).toBe("allow");
	},
);

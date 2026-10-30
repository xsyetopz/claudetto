import type { On, PluginOptions } from "claude-code";
import { type Engine, expect, mock, test } from "claude-code/testing";

const ERROR = "connect ECONNREFUSED 127.0.0.1:9";

const SAME = { url: "https://example.com/a", prompt: "go" };

const OTHER = { url: "https://example.com/b", prompt: "go" };

const lab = (on: On) => {
	const clock = mock.clock(on, { now: 0 });
	on("classic.PostToolUseFailure", () => ({}));
	on("tool.check", () => ({ decision: "allow" }));
	return clock;
};

const failed = ($: Engine, input: Record<string, unknown>, error = ERROR) =>
	$.classic.PostToolUseFailure({
		tool_name: "WebFetch",
		tool_input: input,
		tool_use_id: crypto.randomUUID(),
		error,
	});

const failedTwice = async ($: Engine, input: Record<string, unknown>) => {
	await failed($, input);
	await failed($, input);
};

const retried = ($: Engine, input: Record<string, unknown>) =>
	$.tool.check({ tool: "WebFetch", input });

const options = (set: PluginOptions): { options: PluginOptions } => ({
	options: set,
});

test(
	"an identical call is refused after the fail limit, with the earlier error as the reason",
	options({ failLimit: 2 }),
	async ($: Engine, on: On) => {
		lab(on);
		await failedTwice($, SAME);

		const out = await retried($, SAME);

		expect(out.decision).toBe("deny");
		expect(out.reason).toContain(ERROR);
		expect(out.reason).toContain("failLimit");
	},
);

test(
	"an identical call under the fail limit goes through",
	options({ failLimit: 2 }),
	async ($: Engine, on: On) => {
		lab(on);
		await failed($, SAME);

		const out = await retried($, SAME);

		expect(out.decision).toBe("allow");
	},
);

test(
	"a call with another input is not refused",
	options({ failLimit: 2 }),
	async ($: Engine, on: On) => {
		lab(on);
		await failedTwice($, SAME);

		const out = await retried($, OTHER);

		expect(out.decision).toBe("allow");
	},
);

test(
	"failures with different errors do not add up",
	options({ failLimit: 2 }),
	async ($: Engine, on: On) => {
		lab(on);
		await failed($, SAME, "first error");
		await failed($, SAME, "second error");

		const out = await retried($, SAME);

		expect(out.decision).toBe("allow");
	},
);

test(
	"the refusal lifts once the period has passed since the last failure",
	options({ failLimit: 2, windowSeconds: 60 }),
	async ($: Engine, on: On) => {
		const clock = lab(on);
		await failedTwice($, SAME);
		await clock.advance(61_000);

		const out = await retried($, SAME);

		expect(out.decision).toBe("allow");
	},
);

test("with no option the fail limit is 3", async ($: Engine, on: On) => {
	lab(on);
	await failed($, SAME);
	await failed($, SAME);
	const beforeThird = await retried($, SAME);
	await failed($, SAME);

	const afterThird = await retried($, SAME);

	expect(beforeThird.decision).toBe("allow");
	expect(afterThird.decision).toBe("deny");
});

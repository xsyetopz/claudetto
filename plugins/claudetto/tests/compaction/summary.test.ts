import type { ModelCompleteInput, On, SessionMessage } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

const LOGIN = JSON.stringify({
	oauthAccount: { organizationRateLimitTier: "default_claude_max_20x" },
});

const USAGE = {
	input_tokens: 1,
	output_tokens: 1,
	cache_read_input_tokens: 0,
	cache_creation_input_tokens: 0,
};

const say = (text: string, handle: string): SessionMessage => ({
	role: "user",
	text,
	toolUses: [],
	handle,
});

/** A hook reads `prompt` as joined text and the cache marks on `promptBlocks`. */
const cachedFlags = (request: ModelCompleteInput | undefined): boolean[] =>
	(request?.promptBlocks ?? []).map((block) => block.cache === true);

test("a shipped row makes no model call and the engine compacts", async ($: Engine, on: On) => {
	const asked: ModelCompleteInput[] = [];
	on("env.get", () => ({ value: "/home/me" }));
	on("fs.read", () => ({ value: LOGIN }));
	on("model.complete", (_$, e) => {
		asked.push(e);
		return { deny: "no row prices a cheap summary" };
	});
	on("session.compact", () => ({ skip: "core ran" }));

	const out = await $.session.compact({
		trigger: "auto",
		messages: [say("Build the export.", "h0")],
	});

	expect(asked).toEqual([]);
	expect(out.skip).toBe("core ran");
});

const ON = { options: { cheapSummary: "on" } };

test(
	"the option answers the compaction with one call on the cheap model and a cached block",
	ON,
	async ($: Engine, on: On) => {
		const asked: ModelCompleteInput[] = [];
		on("env.get", () => ({ value: "/home/me" }));
		on("fs.read", () => ({ value: LOGIN }));
		on("model.complete", (_$, e) => {
			asked.push(e);
			return {
				value: { isAnswered: true, text: "The summary.", usage: USAGE },
			};
		});
		on("session.compact", () => ({ skip: "core ran" }));

		const out = await $.session.compact({
			trigger: "auto",
			messages: [say("Build the export.", "h0")],
		});

		expect(asked).toHaveLength(1);
		expect(asked[0]?.model).toBe("claude-haiku-5-5");
		expect(asked[0]?.effort).toBe("medium");
		expect(asked[0]?.maxTokens).toBe(2000);
		expect(cachedFlags(asked[0])).toEqual([true, false]);
		// `usage` is on the compacted half only, and the skipped half declares `messages`, so narrow via `skip`.
		const compacted = "skip" in out ? undefined : out;
		expect(compacted?.messages.map((message) => message.text)).toEqual([
			"The summary.",
		]);
		expect(compacted?.usage).toBe(undefined);
	},
);

test(
	"a call that throws leaves the compaction to the engine",
	ON,
	async ($: Engine, on: On) => {
		const seen = { core: 0 };
		on("env.get", () => ({ value: "/home/me" }));
		on("fs.read", () => ({ value: LOGIN }));
		on("model.complete", () => {
			throw new Error("the provider is down");
		});
		on("session.compact", () => {
			seen.core += 1;
			return { skip: "core ran" };
		});

		const out = await $.session.compact({
			trigger: "auto",
			messages: [say("Build the export.", "h0")],
		});

		expect(seen.core).toBe(1);
		expect(out.skip).toBe("core ran");
	},
);

test(
	"an empty reply leaves the compaction to the engine",
	ON,
	async ($: Engine, on: On) => {
		const seen = { core: 0 };
		on("env.get", () => ({ value: "/home/me" }));
		on("fs.read", () => ({ value: LOGIN }));
		on("model.complete", () => ({
			value: { isAnswered: true, text: "  ", usage: USAGE },
		}));
		on("session.compact", () => {
			seen.core += 1;
			return { skip: "core ran" };
		});

		const out = await $.session.compact({
			trigger: "auto",
			messages: [say("Build the export.", "h0")],
		});

		expect(seen.core).toBe(1);
		expect(out.skip).toBe("core ran");
	},
);

// Lab tests of code compaction (spec `code-compaction`): the `session.compact` hook answers with the handoff message and the tail, where only the rows with `toolResults` have no `handle` (so the engine links them after the boundary), and it makes no model request.

import type {
	On,
	SessionCompactArgs,
	SessionCompactInput,
	SessionCompactTrigger,
	SessionMessage,
} from "claude-code";
import { type Engine, expect, mock, test } from "claude-code/testing";
import { stubFiles } from "./stubs/handover.ts";

const CODE = { options: { compaction: "code" } };

const BUILD_ERROR_CAUSE = /undefined|not an object|null/;

/** The fields that the engine owns, which the lab sets to drive the hook. */
type CompactCall = SessionCompactArgs &
	Pick<SessionCompactInput, "trigger" | "messages" | "agentId">;

interface Compacted {
	messages?: readonly SessionMessage[] | undefined;
	skip?: string | undefined;
	usage?: unknown;
	tokensBefore?: number | undefined;
	tokensAfter?: number | undefined;
}

interface Seen {
	core: number;
	logs: string[];
	texts: string[];
}

const say = (
	role: SessionMessage["role"],
	text: string,
	handle: string,
): SessionMessage => ({ role, text, toolUses: [], handle });

/** A message of `chars` characters, so that the tail budget counts it. */
const big = (role: SessionMessage["role"], handle: string, chars = 9000) =>
	say(role, `${handle} ${"x".repeat(chars)}`, handle);

/** A session that the tail budget cuts to about a third, so that code compaction answers. */
const BIG_SESSION = [
	say("user", "Build the export. Pin `zod` to `3.23`.", "h0"),
	...Array.from({ length: 8 }, (_, i) =>
		big(i % 2 === 0 ? "assistant" : "user", `h${i + 1}`),
	),
];

/** The stubs below the hooks: the core compaction that the fallback reaches, and the log. */
const stubs = (on: On, failWrite = false, cost = { usd: 1 }) => {
	const seen: Seen = { core: 0, logs: [], texts: [] };
	on("session.usage", () => ({
		value: {
			startedAt: 0,
			context: { window: 1_000_000, tokens: 0 },
			cost,
			rateLimits: [{ kind: "five_hour", percentUsed: cost.usd }],
		},
	}));
	mock.env(on, { CLAUDE_PROJECT_DIR: "/p" });
	mock.clock(on, { now: 1000 });
	on("fs.list", () => ({ value: [] }));
	stubFiles(on, seen, failWrite);
	on("session.compact", () => {
		seen.core++;
		return { skip: "core ran" };
	});
	return seen;
};

/** The engine raises `session.compact` with its own `trigger` and `messages`. */
const compact = async (
	$: Engine,
	trigger: SessionCompactTrigger,
	messages: SessionMessage[],
	agentId?: string,
): Promise<Compacted> => {
	const args: CompactCall = {
		trigger,
		messages,
		...(agentId === undefined ? {} : { agentId }),
	};
	return await $.session.compact(args);
};

test("Automatic Compaction", CODE, async ($: Engine, on: On) => {
	const seen = stubs(on);
	const old = [
		say("user", "Build the export. Pin `zod` to `3.23`.", "h0"),
		say("assistant", "Ok.", "h1"),
		big("user", "h2"),
		big("assistant", "h3"),
		big("user", "h4"),
		big("assistant", "h5"),
		big("user", "h6"),
		big("assistant", "h7"),
	];

	const out = await compact($, "auto", old);

	expect(seen.core).toBe(0);
	expect(out.skip).toBeUndefined();
	expect(out.usage).toBeUndefined();
	const [head, ...tail] = out.messages ?? [];
	expect(head?.role).toBe("user");
	expect(head?.handle).toBeUndefined();
	expect(head?.text).toContain("## Constraints and Pins");
	expect(head?.text).toContain("Pin `zod` to `3.23`.");
	expect(tail.map((m) => m.handle)).toEqual(
		tail.map((m) => m.text.split(" ")[0]),
	);
	expect(tail.map((m) => m.text.split(" ")[0])).toEqual(
		["h6", "h7"].slice(-tail.length),
	);
	expect(tail.length).toBeGreaterThan(0);
	expect(tail.length).toBeLessThan(old.length);
	expect(out.tokensAfter).toBeLessThan(out.tokensBefore ?? 0);
	expect(seen.texts[0]).toBe(head?.text);
});

test("Tool Pair Kept", CODE, async ($: Engine, on: On) => {
	stubs(on);
	const use = {
		tool_use_id: "t1",
		tool: "Read",
		input: { file_path: "/p/a.ts" },
		text: "file text",
	};
	const messages: SessionMessage[] = [
		say("user", "Start.", "h0"),
		big("assistant", "h1"),
		big("user", "h2"),
		big("assistant", "h3"),
		big("user", "h4"),
		{ role: "assistant", text: "", toolUses: [use], handle: "h5" },
		{
			role: "user",
			text: "",
			toolUses: [],
			toolResults: [
				{ tool_use_id: "t1", text: "x".repeat(5000), isError: false },
			],
			handle: "h6",
		},
	];

	const out = await compact($, "auto", messages);

	const tail = (out.messages ?? []).slice(1);
	expect(tail.flatMap((m) => m.toolUses.map((u) => u.tool_use_id))).toEqual([
		"t1",
	]);
	expect(
		tail.flatMap((m) => (m.toolResults ?? []).map((r) => r.tool_use_id)),
	).toEqual(["t1"]);
	// The call keeps its `handle`, so the engine returns the whole row (thinking). The result loses it, so the engine rebuilds it and links it after the boundary.
	expect(tail.find((m) => m.toolUses.length > 0)?.handle).toBe("h5");
	expect(tail.find((m) => (m.toolResults ?? []).length > 0)?.handle).toBe(
		undefined,
	);
});

test(
	"Oversized Tail: a last tool result over the tail budget runs the built-in compaction and names the cause",
	CODE,
	async ($: Engine, on: On) => {
		const seen = stubs(on);
		const messages: SessionMessage[] = [
			say("user", "Start.", "h0"),
			big("assistant", "h1"),
			{
				role: "user",
				text: "",
				toolUses: [],
				toolResults: [
					{ tool_use_id: "t1", text: "x".repeat(400_000), isError: false },
				],
				handle: "h2",
			},
		];

		const out = await compact($, "auto", messages);

		expect(seen.core).toBe(1);
		expect(out.skip).toBe("core ran");
		expect(seen.logs).toHaveLength(1);
		expect(seen.texts).toEqual([]);
	},
);

test(
	"a compaction that keeps over half of the context runs the built-in compaction",
	CODE,
	async ($: Engine, on: On) => {
		const seen = stubs(on);

		const out = await compact($, "auto", [
			big("user", "h0", 20_000),
			big("assistant", "h1", 20_000),
		]);

		expect(seen.core).toBe(1);
		expect(out.skip).toBe("core ran");
	},
);

test(
	"the precompute trigger answers and writes no handoff file",
	CODE,
	async ($: Engine, on: On) => {
		const seen = stubs(on);

		const out = await compact($, "precompute", BIG_SESSION);

		expect(out.messages?.[0]?.text).toContain("## Goal");
		expect(seen.texts).toEqual([]);
	},
);

test(
	"an empty message list runs the built-in compaction",
	CODE,
	async ($: Engine, on: On) => {
		const seen = stubs(on);

		const out = await compact($, "auto", []);

		expect(seen.core).toBe(1);
		expect(out.skip).toBe("core ran");
	},
);

test(
	"a failed write of the handoff file is logged, and the answer stands",
	CODE,
	async ($: Engine, on: On) => {
		const seen = stubs(on, true);

		const out = await compact($, "auto", BIG_SESSION);

		expect(out.messages?.[0]?.text).toContain("## Goal");
		expect(seen.core).toBe(0);
		expect(seen.logs).toHaveLength(1);
	},
);

test(
	"the head holds no usage line, so one session state gives one head",
	CODE,
	async ($: Engine, on: On) => {
		const cost = { usd: 1 };
		stubs(on, false, cost);
		const first = await compact($, "auto", BIG_SESSION);

		cost.usd = 77;
		const second = await compact($, "auto", BIG_SESSION);

		expect(first.messages?.[0]?.text).toBeDefined();
		expect(second.messages?.[0]?.text).toBe(first.messages?.[0]?.text);
	},
);

test("Plugin Trigger", CODE, async ($: Engine, on: On) => {
	const seen = stubs(on);

	const out = await compact($, "plugin", BIG_SESSION);

	expect(seen.core).toBe(0);
	expect(out.messages?.[0]?.text).toContain("## Goal");
});

test("Other Options Leave Compaction to Core", async ($: Engine, on: On) => {
	const seen = stubs(on);

	const out = await compact($, "auto", [say("user", "Build it.", "h0")]);

	expect(seen.core).toBe(1);
	expect(out.skip).toBe("core ran");
});

test("Build Error", CODE, async ($: Engine, on: On) => {
	const seen = stubs(on);

	// A call with no `messages`, which the type forbids, so it comes from a parse.
	const out: Compacted = await $.session.compact(
		JSON.parse('{"trigger":"auto"}'),
	);

	expect(seen.core).toBe(1);
	expect(out.skip).toBe("core ran");
	expect(seen.logs).toHaveLength(1);
	expect(seen.logs[0]).toContain("Code compaction failed");
	expect(seen.logs[0]).toMatch(BUILD_ERROR_CAUSE);
});

test(
	"Oversized Head: a handoff over the head budget runs the built-in compaction and names the cause",
	CODE,
	async ($: Engine, on: On) => {
		const seen = stubs(on);
		const rules = Array.from(
			{ length: 20 },
			(_, i): SessionMessage => ({
				role: "assistant",
				text: "",
				toolUses: [
					{
						tool_use_id: `r${i}`,
						tool: "Read",
						input: { file_path: `/p/${i}${"y".repeat(3000)}` },
					},
				],
				handle: `r${i}`,
			}),
		);

		const out = await compact($, "auto", rules);

		expect(seen.core).toBe(1);
		expect(out.skip).toBe("core ran");
		expect(seen.logs[0]).toContain("tokens");
		expect(seen.texts).toEqual([]);
	},
);

test(
	"a subagent compaction goes to the built-in compaction",
	CODE,
	async ($: Engine, on: On) => {
		const seen = stubs(on);

		await compact($, "auto", [say("user", "Hi.", "h0")], "a1");

		expect(seen.core).toBe(1);
	},
);

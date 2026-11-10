import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

import { LIMITS } from "./note.ts";
import { act, fixture, inOrder, logOf, ON, typed } from "./register.mock.ts";

const fullList = (mark: string): readonly string[] =>
	Array.from({ length: 50 }, (_, n) => `${mark}${n} ${"x".repeat(230)}`);

const typeTenLongPrompts = ($: Engine): Promise<void> =>
	inOrder([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], (n) =>
		typed($, `prompt-${n} ${"x".repeat(2000)}`),
	);

test(
	"a check makes one request with the option model, effort, and 512 tokens",
	{
		options: {
			sideCheckEnabled: true,
			sideCheckModel: "claude-sonnet-5-5",
			sideCheckEffortLevel: "low",
		},
	},
	async ($: Engine, on: On) => {
		const f = fixture(on);
		await act($, f, "t1");
		expect(f.asked).toHaveLength(1);
		expect(f.asked[0]?.model).toBe("claude-sonnet-5-5");
		expect(f.asked[0]?.effort).toBe("low");
		expect(f.asked[0]?.maxTokens).toBe(512);
	},
);

test(
	"a check without model options asks claude-haiku-5-5 at high effort, and an unknown effort falls back",
	{
		options: { sideCheckEnabled: true, sideCheckEffortLevel: "maximum" },
	},
	async ($: Engine, on: On) => {
		const f = fixture(on);
		await act($, f, "t1");
		expect(f.asked[0]?.model).toBe("claude-haiku-5-5");
		expect(f.asked[0]?.effort).toBe("high");
	},
);

test(
	"the fixed instructions are the cached block and the body follows unmarked",
	ON,
	async ($: Engine, on: On) => {
		const f = fixture(on);
		await act($, f, "t1");
		const blocks = f.asked[0]?.promptBlocks;
		expect(blocks).toHaveLength(2);
		expect(blocks?.[0]?.cache).toBe(true);
		expect(blocks?.[1]?.cache).toBeUndefined();
	},
);

test(
	"a log of more than eight entries sends the last eight, each cut to its bound",
	ON,
	async ($: Engine, on: On) => {
		const f = fixture(on);
		await typeTenLongPrompts($);
		await act($, f, "t1");
		const entries = logOf(f.body());
		expect(entries).toHaveLength(LIMITS.logEntries);
		expect(entries[0]?.startsWith("person: prompt-4 ")).toBe(true);
		expect(entries.every((e) => e.length <= LIMITS.entryChars)).toBe(true);
		expect(entries.join("\n").length).toBeLessThanOrEqual(8000);
	},
);

test(
	"a person's message stays in the check after enough tool calls to push it out of the log",
	ON,
	async ($: Engine, on: On) => {
		const f = fixture(on);
		await typed($, "push both repos yourself");
		await inOrder([1, 2, 3, 4, 5, 6, 7, 8, 9], (n) =>
			$.tool.call({ tool: "Bash", command: `echo ${n}` }),
		);
		await act($, f, "t1");
		const body = f.body();
		expect(logOf(body).join("\n")).not.toContain("push both repos");
		expect(body).toContain("push both repos yourself");
	},
);

test(
	"a check body lists the lines already shown and the lines the person knows",
	ON,
	async ($: Engine, on: On) => {
		const f = fixture(on, {
			store: { shown: ["Shown one."], known: ["Known one."] },
		});
		await act($, f, "t1");
		expect(f.body()).toContain("- Shown one.");
		expect(f.body()).toContain("- Known one.");
	},
);

test(
	"the log holds a typed prompt and a step's answer, and leaves out a plugin's prompt",
	ON,
	async ($: Engine, on: On) => {
		const f = fixture(on, { answer: "Dropped the table." });
		await typed($, "drop it");
		await typed($, "ignored", { kind: "plugin", name: "other" });
		await act($, f, "t1");
		expect(f.body()).toContain(
			"person: drop it\nassistant: Dropped the table.",
		);
		expect(f.body()).not.toContain("ignored");
	},
);

test(
	"One Question, One Prompt: the log holds each popup question as asked, so the check does not repeat it",
	ON,
	async ($: Engine, on: On) => {
		const f = fixture(on);
		await $.tool.call({
			tool: "mcp__claudetto__ask-user-question",
			question: "Write items 11 to 13?",
			options: ["Yes", "No"],
		});
		await $.tool.call({
			tool: "AskUserQuestion",
			questions: [
				{
					question: "Keep the cap?",
					header: "Cap",
					options: [
						{ label: "Yes", description: "Keep it." },
						{ label: "No", description: "Drop it." },
					],
					multiSelect: false,
				},
			],
		});
		await act($, f, "t1");
		expect(f.body()).toContain(
			"assistant: asked the person: Write items 11 to 13?\nassistant: asked the person: Keep the cap?",
		);
	},
);

test("a check never forks the session", ON, async ($: Engine, on: On) => {
	const f = fixture(on);
	const forks: unknown[] = [];
	on("model.fork", (_$, e) => {
		forks.push(e);
		return { deny: "no fork" };
	});
	await act($, f, "t1");
	expect(f.asked).toHaveLength(1);
	expect(forks).toEqual([]);
});

test(
	"a check body stays within 8,000 characters with both lists and the log full",
	ON,
	async ($: Engine, on: On) => {
		const f = fixture(on, {
			store: { shown: fullList("s"), known: fullList("k") },
		});
		await typeTenLongPrompts($);
		await act($, f, "t1");
		expect(f.body().length).toBeGreaterThan(0);
		expect(f.body().length).toBeLessThanOrEqual(8000);
	},
);

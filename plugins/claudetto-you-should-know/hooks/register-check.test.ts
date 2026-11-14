import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

import { LIMITS } from "./note";
import { act, fixture, inOrder, logOf, ON, typed } from "./register.mock";

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
		expect(f.asked[0]?.timeoutMs).toBe(LIMITS.checkTimeoutMs);
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
	"a model option outside the allowed IDs falls back to claude-haiku-5-5",
	{ options: { sideCheckEnabled: true, sideCheckModel: "haiku" } },
	async ($: Engine, on: On) => {
		const f = fixture(on);
		await act($, f, "t1");
		expect(f.asked[0]?.model).toBe("claude-haiku-5-5");
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
		const options = [
			{ label: "Yes", description: "Do it." },
			{ label: "No", description: "Leave it." },
		];
		await $.tool.call({
			tool: "AskUserQuestion",
			questions: [
				{
					question: "Write items 11 to 13?",
					header: "Items",
					options,
					multiSelect: false,
				},
				{
					question: "Keep the cap?",
					header: "Cap",
					options,
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

test(
	"the log holds the person's answer to a popup, so the check reads the asked-for action as asked",
	ON,
	async ($: Engine, on: On) => {
		const answer = "Undo my changes: revert this branch's guard work";
		const f = fixture(on, { choices: { "Undo or keep?": answer } });
		await $.tool.call({
			tool: "AskUserQuestion",
			questions: [
				{
					question: "Undo or keep?",
					header: "Undo",
					options: [
						{ label: "Undo", description: "Revert it." },
						{ label: "Keep", description: "Leave it." },
					],
					multiSelect: false,
				},
			],
		});
		await act($, f, "t1");
		expect(f.body()).toContain(`person: answered "Undo or keep?": ${answer}`);
	},
);

test(
	"the check instructions name a step that turns off a check the person set",
	ON,
	async ($: Engine, on: On) => {
		const f = fixture(on);
		await act($, f, "t1");
		expect(f.instructions()).toContain("--no-verify");
		expect(f.instructions()).toContain("--no-gpg-sign");
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

test(
	"a check the model does not answer is logged with its reason and the call goes on",
	ON,
	async ($: Engine, on: On) => {
		const f = fixture(on, { unanswered: true });
		const lines: string[] = [];
		on("ui.log", (_$, e) => {
			lines.push(e.text);
			return { value: undefined };
		});
		const out = await act($, f, "t1");
		expect(lines.join("\n")).toContain(
			"The side check was not answered (aborted)",
		);
		expect(out.deny).toBeUndefined();
		expect(f.ran).toEqual(["Bash"]);
	},
);

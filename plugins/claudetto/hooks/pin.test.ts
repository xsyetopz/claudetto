import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";
import { scanned } from "./secrets.mock.ts";

const lab = (
	on: On,
	constraints: unknown[],
	messages: unknown[] = [],
	seen: string[] = [],
	kind = "task",
	issues: { name: string; mtimeMs: number }[] = [],
	cwd = "/repo",
) => {
	on("prompt.submit", (_$, e) => e);
	on("tool.check", () => ({ decision: "allow" }));
	on("session.messages", () => ({ value: messages }));
	on("session.cwd", () => ({ value: cwd }));
	on("fs.exists", () => ({ value: false }));
	on("fs.list", (_$, e) => ({
		value:
			e.path === "/repo"
				? issues.map((f) => ({ kind: "file", size: 1, isLink: false, ...f }))
				: [],
	}));
	on("model.complete", (_$, e) => {
		seen.push(e.prompt);
		return {
			value: {
				isAnswered: true,
				text: JSON.stringify({ kind, constraints }),
				usage: { inputTokens: 1, outputTokens: 1 },
			},
		};
	});
};
const submit = ($: Engine, text = "Make it pass.") =>
	$.prompt.submit({ text, wait: false, origin: { kind: "composer" } });
const check = ($: Engine, tool: string, input: Record<string, unknown>) =>
	$.tool.check({ tool, input });
const RO = [{ text: "Nothing should change on disk.", rule: "read-only" }];

test("a constraint found on one prompt rides the next prompt as context, and the first prompt is not held for it", async ($: Engine, on: On) => {
	lab(on, RO);
	expect((await submit($)).context ?? []).toEqual([]);
	await check($, "Read", { file_path: "/p/a.ts" });
	expect((await submit($)).context?.join("\n")).toContain(
		"Nothing should change on disk.",
	);
});

test("a resumed session's first prompt waits for the constraint its earlier messages hold", async ($: Engine, on: On) => {
	const seen: string[] = [];
	lab(
		on,
		RO,
		[{ role: "user", text: "Nothing should change on disk.", toolUses: [] }],
		seen,
	);
	expect((await submit($)).context?.join("\n")).toContain(
		"Nothing should change on disk.",
	);
	expect(seen.join("\n")).toContain(
		'a permission or go-ahead to do something ("you can commit now")',
	);
});

test("no constraint adds no context", async ($: Engine, on: On) => {
	lab(on, []);
	expect((await submit($)).context ?? []).toEqual([]);
});

test("read-only denies Edit, Write and writing Bash and lets reads through", async ($: Engine, on: On) => {
	lab(on, RO);
	await submit($);
	expect((await check($, "Edit", { file_path: "/p/a.ts" })).decision).toBe(
		"deny",
	);
	expect((await check($, "Write", { file_path: "/p/a.ts" })).decision).toBe(
		"deny",
	);
	expect(
		(await check($, "Bash", { command: "echo 1 > src/a.ts" })).decision,
	).toBe("deny");
	expect(
		(await check($, "Bash", { command: "sed -i '' s/a/b/ src/a.ts" })).decision,
	).toBe("deny");
	expect(
		(await check($, "Bash", { command: "git commit -am x" })).decision,
	).toBe("deny");
	expect(
		(await check($, "Bash", { command: "bun test 2>&1 | tail -5" })).decision,
	).not.toBe("deny");
	expect((await check($, "Read", { file_path: "/p/a.ts" })).decision).not.toBe(
		"deny",
	);
});

test("no-commit denies git commit only", async ($: Engine, on: On) => {
	lab(on, [{ text: "Do not commit.", rule: "no-commit" }]);
	await submit($);
	expect(
		(await check($, "Bash", { command: "git commit -m x" })).decision,
	).toBe("deny");
	expect((await check($, "Edit", { file_path: "/p/a.ts" })).decision).not.toBe(
		"deny",
	);
});

test("only-files denies an edit of another file", async ($: Engine, on: On) => {
	lab(on, [
		{
			text: "Only touch src/config.ts.",
			rule: "only-files",
			files: ["src/config.ts"],
		},
	]);
	await submit($);
	expect(
		(await check($, "Edit", { file_path: "/p/src/config.ts" })).decision,
	).not.toBe("deny");
	expect(
		(await check($, "Edit", { file_path: "/p/src/total.ts" })).decision,
	).toBe("deny");
});

test("the prior messages reach the extractor even when a message has no toolResults field", async ($: Engine, on: On) => {
	const seen: string[] = [];
	lab(
		on,
		RO,
		[
			{ role: "user", text: "Nothing should change on disk.", toolUses: [] },
			{ role: "assistant", text: "OK.", toolUses: [] },
			{ role: "user", text: "", toolUses: [], toolResults: [{}] },
		],
		seen,
	);
	await submit($);
	expect(seen.join("\n")).toContain("1. Nothing should change on disk.");
});

test("the extractor is told that a file to change or a claim about the code is not a constraint", async ($: Engine, on: On) => {
	const seen: string[] = [];
	lab(on, [], [], seen);
	await submit($, "Rename the export in src/format.ts and you're finished.");
	expect(seen.join("\n")).toContain("a file the user asks to change");
});

test("no-questions denies both ask tools, before delegation answers them, and nothing else", async ($: Engine, on: On) => {
	lab(on, [{ text: "Stop asking questions.", rule: "no-questions" }]);
	await submit($, "stop asking questions. fix the problems");
	const asks = await Promise.all(
		["mcp__claudetto__ask-user-question", "AskUserQuestion"].map((tool) =>
			$.tool.call({ tool, question: "Which?", options: ["Alpha", "Beta"] }),
		),
	);
	expect(asks[0]?.deny).toContain("state the reading you took");
	expect(asks[1]?.deny).toContain("state the reading you took");
	expect(asks[0]?.deny).not.toContain("ask whether");
	expect((await check($, "Edit", { file_path: "/p/a.ts" })).decision).not.toBe(
		"deny",
	);
});

const person = {
	role: "user",
	text: "Who told you to lint the docs?",
	toolUses: [],
};
const reads = (file: string, failed = false) => ({
	role: "assistant",
	text: "",
	toolUses: [
		{
			tool_use_id: "t",
			tool: "Read",
			input: { file_path: file },
			...(failed ? { isError: true } : {}),
		},
	],
});
const spoken = (text: string, ...tools: string[]) => ({
	role: "assistant",
	text,
	toolUses: tools.map((tool) => ({ tool_use_id: "t", tool, input: {} })),
});
const turn =
	(kind: string, ...after: unknown[]) =>
	($: Engine, on: On) => {
		lab(on, [], [person, ...after], [], kind);
		return submit($, person.text);
	};

test("a remark's first tool call, a read-only one too, is denied with the answer-first text", async ($: Engine, on: On) => {
	await turn("remark")($, on);
	const r = await check($, "Grep", { pattern: "lint" });
	expect(r.decision).toBe("deny");
	expect(r.reason).toContain("Answer from what the session holds");
});

test("a question's first call that writes or runs a command is denied, and so is a sibling call of the same batch", async ($: Engine, on: On) => {
	lab(on, [], [person], [], "question");
	await submit($, person.text);
	expect((await check($, "Bash", { command: "ls" })).decision).toBe("deny");
	expect((await check($, "Edit", { file_path: "/p/a.ts" })).decision).toBe(
		"deny",
	);
});

for (const [tool, input] of [
	["ListAgents", {}],
	["Read", { file_path: "/p/a.ts" }],
	["Grep", { pattern: "lint" }],
	["Glob", { pattern: "*.ts" }],
] as const) {
	test(`a question's first ${tool} call passes the answer-first gate`, async ($: Engine, on: On) => {
		await turn("question")($, on);
		expect((await check($, tool, input)).decision).not.toBe("deny");
	});
}

test("a remark's call passes once assistant text precedes it in the turn", async ($: Engine, on: On) => {
	await turn("remark", spoken("Nobody did; I misread the task."))($, on);
	expect((await check($, "Grep", { pattern: "lint" })).decision).not.toBe(
		"deny",
	);
});

test("text from before the person's message does not count as an answer", async ($: Engine, on: On) => {
	lab(
		on,
		[],
		[spoken("Earlier reply."), person, spoken("", "Grep")],
		[],
		"remark",
	);
	await submit($, person.text);
	expect((await check($, "Grep", { pattern: "x" })).decision).toBe("deny");
});

test("a task message is never held for an answer", async ($: Engine, on: On) => {
	await turn("task")($, on);
	expect((await check($, "Grep", { pattern: "lint" })).decision).not.toBe(
		"deny",
	);
});

test("an unreadable kind leaves the message a task", async ($: Engine, on: On) => {
	await turn("nonsense")($, on);
	expect((await check($, "Grep", { pattern: "lint" })).decision).not.toBe(
		"deny",
	);
});

const ASK = "mcp__claudetto__ask-user-question";
const OLD = { name: "ISSUES-2026-11-03-2333.md", mtimeMs: 1 };
const NEW = { name: "ISSUES-2026-11-05-2100.md", mtimeMs: 2 };
// The stub stands for the stock dialog `delegation`'s ask tool opens: it answers the first option.
const asking =
	(messages: unknown[], issues = [OLD, NEW], cwd = "/repo") =>
	async ($: Engine, on: On) => {
		lab(on, [], messages, [], "task", issues, cwd);
		// The cwd's distance up to the repo root, as `git rev-parse --show-cdup` gives it.
		const cdup = "../".repeat(cwd.split("/").length - 2);
		on("process.run", (_$, e, next) =>
			e.argv.join(" ") === "git rev-parse --show-cdup"
				? {
						value: {
							exitCode: 0,
							stdout: `${cdup}\n`,
							stderr: "",
							isStdoutTruncated: false,
							isStderrTruncated: false,
						},
					}
				: (scanned(e) ?? next(e)),
		);
		on("clock.now", () => ({ value: 0 }));
		on("session.start", () => ({ cwd: "/repo" }));
		on("tool.register", (_$, e) => ({
			value: { tool: `mcp__claudetto__${e.name}` },
		}));
		on("tool.call", { tool: "AskUserQuestion" }, (_$, e) => {
			const [first] = e.questions;
			return {
				result: {
					questions: e.questions,
					answers: { [first?.question ?? ""]: first?.options[0]?.label ?? "" },
				},
			};
		});
		await $.session.start({
			cwd: "/repo",
			surface: null,
			isInteractive: false,
		});
		return JSON.stringify(
			await $.tool.call({
				tool: ASK,
				question: "Restore it?",
				options: ["A", "B"],
			}),
		);
	};

test("an ask is denied until the newest ISSUES file is read, and the deny names it", async ($: Engine, on: On) => {
	const out = await asking([])($, on);
	expect(out).not.toContain("The user answered");
	expect(out).toContain("ISSUES-2026-11-05-2100.md");
	expect(out).toContain("it may answer the question");
});

test("reading only an older ISSUES file leaves the ask denied", async ($: Engine, on: On) => {
	const out = await asking([reads("/repo/ISSUES-2026-11-03-2333.md")])($, on);
	expect(out).not.toContain("The user answered");
});

test("a successful Read of the newest ISSUES file, by absolute path, lets the ask pass", async ($: Engine, on: On) => {
	const out = await asking([reads("/repo/ISSUES-2026-11-05-2100.md")])($, on);
	expect(out).toContain("The user answered");
});

test("a relative path counts too", async ($: Engine, on: On) => {
	const out = await asking([reads("ISSUES-2026-11-05-2100.md")])($, on);
	expect(out).toContain("The user answered");
});

test("a failed Read of the newest ISSUES file does not count", async ($: Engine, on: On) => {
	const out = await asking([reads("/repo/ISSUES-2026-11-05-2100.md", true)])(
		$,
		on,
	);
	expect(out).not.toContain("The user answered");
});

const bash = (command: string, failed = false) => ({
	role: "assistant",
	text: "",
	toolUses: [
		{
			tool_use_id: "t",
			tool: "Bash",
			input: { command },
			...(failed ? { isError: true } : {}),
		},
	],
});

for (const command of [
	"cat ISSUES-2026-11-05-2100.md",
	"head -n 40 /repo/ISSUES-2026-11-05-2100.md",
	"cd /repo && sed -n 1,80p ISSUES-2026-11-05-2100.md",
]) {
	test(`a Bash read counts: ${command}`, async ($: Engine, on: On) => {
		const out = await asking([bash(command)])($, on);
		expect(out).toContain("The user answered");
	});
}

for (const [label, message] of [
	["a failed Bash read", bash("cat ISSUES-2026-11-05-2100.md", true)],
	["a Bash write", bash("echo x > ISSUES-2026-11-05-2100.md")],
	["a Bash read of an older file", bash("cat ISSUES-2026-11-03-2333.md")],
] as const) {
	test(`${label} does not count`, async ($: Engine, on: On) => {
		expect(await asking([message])($, on)).not.toContain("The user answered");
	});
}

test("a symlinked ISSUES file with the newest target counts as the newest", async ($: Engine, on: On) => {
	on("fs.stat", () => ({
		value: { kind: "file", size: 1, mtimeMs: 9, isLink: true },
	}));
	const link = { name: "ISSUES.md", mtimeMs: 0, kind: "other", isLink: true };
	const out = await asking([], [OLD, NEW, link])($, on);
	expect(out).toContain("ISSUES.md");
	expect(out).not.toContain("The user answered");
});

test("a session in a subfolder is held to the ISSUES file at the repo root, named by its path from there", async ($: Engine, on: On) => {
	const out = await asking([], [OLD, NEW], "/repo/sub")($, on);
	expect(out).toContain("../ISSUES-2026-11-05-2100.md");
	expect(out).not.toContain("The user answered");
});

test("a session in a subfolder that read the root ISSUES file by its relative path may ask", async ($: Engine, on: On) => {
	const out = await asking(
		[bash("cat ../ISSUES-2026-11-05-2100.md")],
		[OLD, NEW],
		"/repo/sub",
	)($, on);
	expect(out).toContain("The user answered");
});

test("no ISSUES file at the root, no gate on the ask", async ($: Engine, on: On) => {
	const out = await asking([], [])($, on);
	expect(out).toContain("The user answered");
});

test("the call that retries after the deny passes once, with no text, because the turn has moved on", async ($: Engine, on: On) => {
	const messages: unknown[] = [person];
	lab(on, [], messages, [], "remark");
	await submit($, person.text);
	expect((await check($, "Grep", {})).decision).toBe("deny");
	messages.push(spoken("", "Grep"), {
		role: "user",
		text: "",
		toolUses: [],
		toolResults: [{}],
	});
	expect((await check($, "Grep", {})).decision).not.toBe("deny");
});

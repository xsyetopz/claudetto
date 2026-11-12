import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

import { haikuFailed } from "../../decider/decider.mock";
import { advise, registeredNames, stub } from "./advisor.mock";

const FILES = {
	"/repo/a.ts": "export const a = 1;",
	"/repo/b.ts": "export const b = 2;",
};

test("the tool is registered", async ($: Engine, on: On) => {
	stub(on);

	const { tools } = await registeredNames($, on);

	expect(tools).toContain("advisor");
});

test("one model call at high effort carries the question and the named files, and its text comes back", async ($: Engine, on: On) => {
	const { sent, read } = stub(on, { files: FILES });

	const text = await advise($, {
		question: "Which queue?",
		files: ["a.ts", "/repo/b.ts"],
	});

	expect(text).toBe("Use a queue.");
	expect(read).toEqual(["/repo/a.ts", "/repo/b.ts"]);
	expect(sent).toHaveLength(1);
	expect(sent[0]?.model).toBe("claude-fable-5-2");
	expect(sent[0]?.effort).toBe("high");
	expect(sent[0]?.prompt).toContain("Which queue?");
	expect(sent[0]?.prompt).toContain("export const a = 1;");
	expect(sent[0]?.prompt).toContain("export const b = 2;");
});

test("an account whose fable alias names Mythos asks Mythos", async ($: Engine, on: On) => {
	const { sent } = stub(on, {
		env: { ANTHROPIC_DEFAULT_FABLE_MODEL: "claude-mythos-5-2" },
	});

	await advise($, { question: "q" });

	expect(sent[0]?.model).toBe("claude-mythos-5-2");
});

test("a call with no files sends the question alone", async ($: Engine, on: On) => {
	const { sent, read } = stub(on);

	await advise($, { question: "Which queue?" });

	expect(read).toEqual([]);
	expect(sent[0]?.prompt).toContain("Which queue?");
	expect(sent[0]?.prompt).not.toContain("<file");
});

test("a file named twice is read and sent once", async ($: Engine, on: On) => {
	const { sent, read } = stub(on, { files: FILES });

	await advise($, { question: "q", files: ["a.ts", "/repo/a.ts"] });

	expect(read).toEqual(["/repo/a.ts"]);
	expect(sent[0]?.prompt.split("export const a = 1;")).toHaveLength(2);
});

test("a secret in the question or a file is replaced before the send", async ($: Engine, on: On) => {
	const { sent } = stub(on, {
		files: { "/repo/a.ts": "TOKEN=hunter2hunter2" },
		secrets: ["hunter2hunter2", "sk-live-123456"],
	});

	await advise($, { question: "Is sk-live-123456 ok?", files: ["a.ts"] });

	expect(sent[0]?.prompt).not.toContain("hunter2hunter2");
	expect(sent[0]?.prompt).not.toContain("sk-live-123456");
	expect(sent[0]?.prompt).toContain("[REDACTED]");
});

test("a file the read rules deny is refused and nothing is sent", async ($: Engine, on: On) => {
	const { sent, read } = stub(on, {
		files: FILES,
		denied: ["/repo/a.ts"],
	});

	const text = await advise($, { question: "q", files: ["a.ts", "b.ts"] });

	expect(text).toContain("/repo/a.ts");
	expect(read).toEqual([]);
	expect(sent).toEqual([]);
});

test("a file that cannot be read is named and nothing is sent", async ($: Engine, on: On) => {
	const { sent } = stub(on);

	const text = await advise($, { question: "q", files: ["gone.ts"] });

	expect(text).toContain("/repo/gone.ts");
	expect(sent).toEqual([]);
});

test("a scanner that fails stops the send", async ($: Engine, on: On) => {
	const { sent } = stub(on, { scanFails: true });

	const text = await advise($, { question: "q" });

	expect(text).toContain("scanner");
	expect(sent).toEqual([]);
});

test("a question that is empty or not text sends nothing", async ($: Engine, on: On) => {
	const { sent } = stub(on);

	expect(await advise($, { question: "  " })).toContain("question");
	expect(await advise($, {})).toContain("question");
	expect(await advise($, { question: "q", files: "a.ts" })).toContain("files");
	expect(sent).toEqual([]);
});

test("a model that gives no text, or a refused request, comes back as a reason", async ($: Engine, on: On) => {
	stub(on, { answer: haikuFailed("api-error") });
	expect(await advise($, { question: "q" })).toContain("api-error");
});

test("a tool other than advisor passes on", async ($: Engine, on: On) => {
	const { sent } = stub(on);

	await $.tool.call({ tool: "Bash", command: "ls" });

	expect(sent).toEqual([]);
});

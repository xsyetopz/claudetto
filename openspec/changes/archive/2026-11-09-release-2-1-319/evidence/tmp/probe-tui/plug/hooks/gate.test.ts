import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

const REASON = "[Data Exfiltration] the call sends a file out";
const FETCH = { url: "https://example.com/u?d=1", prompt: "go" };
const PERSON = {
	text: "go on",
	wait: false,
	origin: { kind: "composer" },
} as const;

const repo = (on: On, files: string[] = []) => {
	on("session.cwd", () => ({ value: "/p" }));
	on("fs.exists", (_$, e) => ({
		value: files.some((f) => e.path === `/p/${f}`),
	}));
};

const allowing = (on: On) => {
	on("prompt.submit", (_$, e) => e);
	on("classic.PermissionDenied", () => ({}));
	on("tool.check", () => ({ decision: "allow" }));
};

const denied = ($: Engine) =>
	$.classic.PermissionDenied({
		tool_name: "WebFetch",
		tool_input: FETCH,
		tool_use_id: crypto.randomUUID(),
		reason: REASON,
	});

const checked = ($: Engine) => $.tool.check({ tool: "WebFetch", input: FETCH });

test("a shell command the gate refuses is denied over an allow, with the command in the reason", async ($: Engine, on: On) => {
	repo(on);
	on("tool.check", () => ({ decision: "allow" }));

	const verdict = await $.tool.check({
		tool: "Bash",
		input: { command: "rm -rf /" },
	});

	expect(verdict.decision).toBe("deny");
	expect(verdict.reason).toContain("rm -rf /");
});

test("the engine's stricter verdict stands", async ($: Engine, on: On) => {
	repo(on);
	on("tool.check", () => ({ decision: "deny", reason: "by a rule" }));

	const verdict = await $.tool.check({
		tool: "Bash",
		input: { command: "git push --force" },
	});

	expect(verdict).toMatchObject({ decision: "deny", reason: "by a rule" });
});

test("a force push is asked about, not denied", async ($: Engine, on: On) => {
	repo(on);
	on("tool.check", () => ({ decision: "allow" }));

	const verdict = await $.tool.check({
		tool: "Bash",
		input: { command: "git push --force" },
	});

	expect(verdict.decision).toBe("ask");
});

test("a write to a system folder is denied for Write", async ($: Engine, on: On) => {
	on("tool.check", () => ({ decision: "allow" }));

	const verdict = await $.tool.check({
		tool: "Write",
		input: { file_path: "/etc/hosts", content: "x" },
	});

	expect(verdict.decision).toBe("deny");
});

test("a command the gate allows is left to the engine", async ($: Engine, on: On) => {
	repo(on);
	on("tool.check", () => ({ decision: "allow" }));

	const verdict = await $.tool.check({
		tool: "Bash",
		input: { command: "ls -la" },
	});

	expect(verdict.decision).toBe("allow");
});

test("the dialog answer is a denial for a refused command", async ($: Engine, on: On) => {
	repo(on);
	on("classic.PermissionRequest", () => ({}));
	const answer = await $.classic.PermissionRequest({
		tool_name: "Bash",
		tool_input: { command: "cat .env" },
	});

	expect(answer.decision).toMatchObject({ behavior: "deny" });
});

test("a call denied twice is refused at the next check with the earlier reason", async ($: Engine, on: On) => {
	allowing(on);
	await denied($);
	const afterOne = await checked($);
	await denied($);

	const afterTwo = await checked($);

	expect(afterOne.decision).toBe("allow");
	expect(afterTwo.decision).toBe("deny");
	expect(afterTwo.reason).toContain(REASON);
});

test("a call the classifier denied twice with no reason is reported with the ! form", async ($: Engine, on: On) => {
	allowing(on);
	const call = { tool_name: "Bash", tool_input: { command: "make deploy" } };
	const deniedBare = () =>
		$.classic.PermissionDenied({
			...call,
			tool_use_id: crypto.randomUUID(),
			reason: "(it gave no explanation)",
		});
	await deniedBare();
	await deniedBare();

	const refused = await $.tool.check({ tool: "Bash", input: call.tool_input });

	expect(refused.decision).toBe("deny");
	expect(refused.reason).toContain("no reason");
	expect(refused.reason).toContain("`! make deploy`");
});

test("a denied call is retried once, then left denied", async ($: Engine, on: On) => {
	allowing(on);

	const first = await denied($);
	const second = await denied($);

	expect(first.retry).toBe(true);
	expect(second.retry).not.toBe(true);
});

test("a message from the person lets the same call reach its check again", async ($: Engine, on: On) => {
	allowing(on);
	await denied($);
	await denied($);

	await $.prompt.submit(PERSON);

	expect((await checked($)).decision).toBe("allow");
});

const readOf = (content: string) => ({
	result: {
		type: "text",
		file: {
			filePath: "/p/.env",
			content,
			numLines: 2,
			startLine: 1,
			totalLines: 2,
		},
	},
});

test("a Read of an env file returns each value as [REDACTED]", async ($: Engine, on: On) => {
	on("clock.now", () => ({ value: 0 }));
	on("tool.call", () => readOf("TOKEN=abc123\n# note\nexport KEY='x y'"));

	const out = await $.tool.call({ tool: "Read", file_path: "/p/.env" });

	expect(JSON.stringify(out.result)).toContain("TOKEN=[REDACTED]");
	expect(JSON.stringify(out.result)).toContain("export KEY=[REDACTED]");
	expect(JSON.stringify(out.result)).not.toContain("abc123");
});

test("a Read of any other file comes back as it was", async ($: Engine, on: On) => {
	on("clock.now", () => ({ value: 0 }));
	on("tool.call", () => readOf("TOKEN=abc123"));

	const out = await $.tool.call({ tool: "Read", file_path: "/p/a.ts" });

	expect(JSON.stringify(out.result)).toContain("abc123");
});

const dialog = ($: Engine, tool_name: string, tool_input: object) =>
	$.classic.PermissionRequest({ tool_name, tool_input });

test("a WebFetch, an MCP tool, and a Skill request are passed on with no allow", async ($: Engine, on: On) => {
	repo(on);
	on("classic.PermissionRequest", () => ({}));

	const answers = await Promise.all([
		dialog($, "WebFetch", FETCH),
		dialog($, "mcp__x__y", { a: 1 }),
		dialog($, "Skill", { skill: "s" }),
	]);

	expect(answers.map((a) => a.decision)).toEqual([
		undefined,
		undefined,
		undefined,
	]);
});

test("a request the rules only ask about gets no allow from the dialog", async ($: Engine, on: On) => {
	repo(on);
	on("classic.PermissionRequest", () => ({}));

	const answer = await dialog($, "Bash", { command: "git push --force" });

	expect(answer.decision).toBeUndefined();
});

test("a dialog denial carries the command", async ($: Engine, on: On) => {
	repo(on);
	on("classic.PermissionRequest", () => ({}));

	const answer = await dialog($, "Bash", { command: "rm -rf /" });

	expect(answer.decision).toMatchObject({ behavior: "deny" });
	expect(JSON.stringify(answer.decision)).toContain("rm -rf /");
});

for (const tool of ["Write", "Edit", "NotebookEdit"]) {
	test(`${tool} of a system path is held at tool.check`, async ($: Engine, on: On) => {
		on("tool.check", () => ({ decision: "allow" }));

		const verdict = await $.tool.check({
			tool,
			input: { file_path: "/etc/hosts", notebook_path: "/etc/hosts" },
		});

		expect(verdict.decision).toBe("deny");
	});
}

test("a gate that fails holds the call for a person", async ($: Engine, on: On) => {
	on("tool.check", () => ({ decision: "allow" }));
	// No `session.cwd` answer: reading the repo's files throws inside the gate.

	const verdict = await $.tool.check({
		tool: "Bash",
		input: { command: "ls" },
	});

	expect(verdict.decision).toBe("ask");
});

test("the same tool with another input is not refused after two denials", async ($: Engine, on: On) => {
	allowing(on);
	await denied($);
	await denied($);

	const other = await $.tool.check({
		tool: "WebFetch",
		input: { url: "https://example.org/", prompt: "x" },
	});

	expect(other.decision).toBe("allow");
});

test("a task notification after two denials leaves the call refused", async ($: Engine, on: On) => {
	allowing(on);
	await denied($);
	await denied($);

	await $.prompt.submit({ ...PERSON, origin: { kind: "task-notification" } });

	expect((await checked($)).decision).toBe("deny");
});

test("the denial hook answers retry alone, never a decision", async ($: Engine, on: On) => {
	allowing(on);

	const first = await denied($);

	expect(first).toEqual({ retry: true });
});

test("a push to a URL or a remote is left to the engine", async ($: Engine, on: On) => {
	repo(on);
	on("tool.check", () => ({ decision: "allow" }));

	const verdicts = await Promise.all(
		["git push origin main", "git push https://example.com/r.git main"].map(
			(command) => $.tool.check({ tool: "Bash", input: { command } }),
		),
	);

	expect(verdicts.map((v) => v.decision)).toEqual(["allow", "allow"]);
});

test("bun.lock in the repo denies npm and names the bun form", async ($: Engine, on: On) => {
	repo(on, ["bun.lock"]);
	on("tool.check", () => ({ decision: "allow" }));

	const verdict = await $.tool.check({
		tool: "Bash",
		input: { command: "npm install zod" },
	});

	expect(verdict.decision).toBe("deny");
	expect(verdict.reason).toContain("bun add");
});

test("a Monitor command the gate refuses is denied like a Bash one", async ($: Engine, on: On) => {
	repo(on);
	on("tool.check", () => ({ decision: "allow" }));

	const verdict = await $.tool.check({
		tool: "Monitor",
		input: { command: "rm -rf /" },
	});

	expect(verdict.decision).toBe("deny");
	expect(verdict.reason).toContain("rm -rf /");
});

for (const [input, decision] of [
	[{ pattern: "TOKEN", path: ".env", output_mode: "content" }, "deny"],
	[{ pattern: "TOKEN", glob: ".env*", output_mode: "content" }, "deny"],
	[{ pattern: "TOKEN", glob: "**/*.env", output_mode: "content" }, "deny"],
	[{ pattern: "TOKEN", path: ".env" }, "allow"],
	[{ pattern: "\\.env", path: "src", output_mode: "content" }, "allow"],
] as const) {
	test(`a Grep ${JSON.stringify(input)} is ${decision === "deny" ? "denied" : "let through"}`, async ($: Engine, on: On) => {
		repo(on);
		on("tool.check", () => ({ decision: "allow" }));

		const verdict = await $.tool.check({ tool: "Grep", input });

		expect(verdict.decision).toBe(decision);
	});
}

test("autoMode in the settings changes no tool.check verdict of the gate", async ($: Engine, on: On) => {
	const read: string[] = [];
	repo(on);
	on("settings.read", (_$, e) => {
		read.push(JSON.stringify(e));
		return { value: { autoMode: { allow: ["Run anything"] } } };
	});
	on("tool.check", () => ({ decision: "allow" }));

	const verdict = await $.tool.check({
		tool: "Bash",
		input: { command: "rm -rf /" },
	});

	expect(verdict.decision).toBe("deny");
	expect(read.filter((key) => key.includes("autoMode"))).toEqual([]);
});

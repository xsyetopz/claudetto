import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

import { ruleScanner, scanner } from "../../secrets.mock";
import {
	allowing,
	bashOf,
	checked,
	denied,
	KEY,
	PERSON,
	REASON,
	repo,
	scanning,
} from "./gate.mock";

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
		tool_input: { command: "rm -rf /" },
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
	expect(refused.reason).toContain("make deploy");
});

test("a denied call is retried once, then left denied", async ($: Engine, on: On) => {
	allowing(on);

	const first = await denied($);
	const second = await denied($);

	expect(first.retry).toBe(true);
	expect(second.retry).not.toBe(true);
});

test("a denial with no reason is not retried", async ($: Engine, on: On) => {
	allowing(on);

	const answer = await $.classic.PermissionDenied({
		tool_name: "Bash",
		tool_input: { command: "make deploy" },
		tool_use_id: crypto.randomUUID(),
		reason: "(it gave no explanation)",
	});

	expect(answer.retry).not.toBe(true);
});

test("a message from the person lets the same call reach its check again", async ($: Engine, on: On) => {
	allowing(on);
	on("session.cwd", () => ({ value: "/repo" }));
	on("session.messages", () => ({ value: [] }));
	await denied($);
	await denied($);

	await $.prompt.submit(PERSON);

	const awaited = await checked($);
	expect(awaited.decision).toBe("allow");
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

	const awaited2 = await checked($);
	expect(awaited2.decision).toBe("deny");
});

test("the denial hook answers retry alone, never a decision", async ($: Engine, on: On) => {
	allowing(on);

	const first = await denied($);

	expect(first).toEqual({ retry: true });
});

test("a secret the scanner finds in a tool result reaches the model as [REDACTED]", async ($: Engine, on: On) => {
	scanner(on, [KEY]);
	scanning(on, bashOf(`TOKEN=${KEY}\nPORT=5432\n`));

	const out = await $.tool.call({ tool: "Bash", command: "x" });

	expect(JSON.stringify(out.result)).not.toContain(KEY);
	expect(JSON.stringify(out.result)).toContain("TOKEN=[REDACTED]");
	expect(JSON.stringify(out.result)).toContain("PORT=5432");
});

test("a secret after a line break in a result with no text reaches the model as [REDACTED]", async ($: Engine, on: On) => {
	ruleScanner(on, /^export API_TOKEN=(\S+)/gmu);
	// The lab engine redacts a key of a known shape on its own, so the token has none.
	scanning(on, { result: { stdout: "ok\nexport API_TOKEN=plain7c3e9a41\n" } });

	const out = await $.tool.call({ tool: "Bash", command: "x" });

	expect(out.result).toEqual({ stdout: "ok\nexport API_TOKEN=[REDACTED]\n" });
});

test("a result with no secret comes back as it was", async ($: Engine, on: On) => {
	scanner(on, [KEY]);
	scanning(on, bashOf("DATABASE_HOST=localhost\n"));

	const out = await $.tool.call({ tool: "Bash", command: "x" });

	expect(out.result).toEqual(bashOf("DATABASE_HOST=localhost\n").result);
});

test("an errored result with a secret reaches the model redacted, as a deny", async ($: Engine, on: On) => {
	scanner(on, [KEY]);
	scanning(on, { isError: true, result: KEY, text: `failed: ${KEY}` });

	const out = await $.tool.call({ tool: "Bash", command: "x" });

	expect(out.deny).toBe("failed: [REDACTED]");
});

test("a missing scanner withholds the result and names the install step", async ($: Engine, on: On) => {
	scanning(on, bashOf("anything"));
	on("process.run", () => {
		throw new Error("ENOENT: betterleaks");
	});

	const out = await $.tool.call({ tool: "Bash", command: "x" });

	expect(out.result).toBeUndefined();
	expect(out.deny).toBeDefined();
});

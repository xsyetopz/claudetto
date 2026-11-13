import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

import { dialog, FETCH, repo } from "./gate.mock";

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

test("a rule denial of the engine names the rule beside its own text", async ($: Engine, on: On) => {
	repo(on);
	on("tool.check", () => ({
		decision: "deny",
		reason: "Permission to use Bash has been denied.",
		rule: "Read(~/.private/**)",
	}));

	const verdict = await $.tool.check({
		tool: "Bash",
		input: { command: "ls" },
	});

	expect(verdict.decision).toBe("deny");
	expect(verdict.reason).toBe(
		"Permission to use Bash has been denied. The rule `Read(~/.private/**)` denies it.",
	);
});

test("a denial with no rule keeps the engine's text", async ($: Engine, on: On) => {
	repo(on);
	on("tool.check", () => ({ decision: "deny", reason: "by a mode" }));

	const verdict = await $.tool.check({
		tool: "Bash",
		input: { command: "ls" },
	});

	expect(verdict.reason).toBe("by a mode");
});

test("`.env` as text in a pattern or a quoted name is not read as an env-file read", async ($: Engine, on: On) => {
	repo(on);
	on("tool.check", () => ({ decision: "allow" }));
	const verdicts = await Promise.all(
		[
			String.raw`grep -rnE 'process\.env\.|Bun\.env\.' src`,
			`bun -e 'console.log([".env", ".env.local"])'`,
		].map((command) => $.tool.check({ tool: "Bash", input: { command } })),
	);
	expect(verdicts.map((v) => v.decision)).toEqual(["allow", "allow"]);
});

import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

import {
	asking,
	logging,
	parsedLines,
	run,
	start,
	walledLab,
} from "./gate.mock.ts";

for (const command of [
	"cd /tmp/p && ls -la 2>&1 | tail -50",
	"git status",
	"grep -rn x src | wc -l",
]) {
	test(`an ask on ${command} becomes an allow`, async ($: Engine, on: On) => {
		asking(on);
		const verdict = await $.tool.check({ tool: "Bash", input: { command } });
		expect(verdict.decision).toBe("allow");
	});
}

for (const command of [
	"curl example.com",
	"echo a > f.txt",
	"ls | sh",
	"sudo ls",
	"ls > out.txt",
	"bun test",
	"bun run test src/a.test.ts",
	"git diff --output=f",
	"echo $(rm -rf x)",
]) {
	test(`an ask on ${command} stays an ask`, async ($: Engine, on: On) => {
		asking(on);
		const verdict = await $.tool.check({ tool: "Bash", input: { command } });
		expect(verdict.decision).not.toBe("allow");
	});
}

test("an ask a settings rule made on a read-only command stays an ask", async ($: Engine, on: On) => {
	asking(on, { rule: "Bash(git status)" });
	const verdict = await $.tool.check({
		tool: "Bash",
		input: { command: "git status" },
	});
	expect(verdict.decision).toBe("ask");
});

test("an ask is logged with its rule, tool, and time", async ($: Engine, on: On) => {
	const lines = logging(on, { decision: "ask", rule: "Bash(git push:*)" });
	await $.tool.check({ tool: "Bash", input: { command: "git push" } });
	expect(parsedLines(lines)).toEqual([
		{
			time: "1970-01-01T00:00:00.000Z",
			tool: "Bash",
			decision: "ask",
			root: "/p",
			rule: "Bash(git push:*)",
			command: "git push",
		},
	]);
});

test("a deny is logged", async ($: Engine, on: On) => {
	const lines = logging(on, { decision: "deny", reason: "by a rule" });
	await $.tool.check({ tool: "Bash", input: { command: "git push" } });
	expect(parsedLines(lines)).toMatchObject([
		{ decision: "deny", rule: "by a rule" },
	]);
});

test("an allow is not logged", async ($: Engine, on: On) => {
	const lines = logging(on, { decision: "allow" });
	await $.tool.check({ tool: "Bash", input: { command: "git status" } });
	expect(lines).toEqual([]);
});

test("a command past 200 characters is cut to 200", async ($: Engine, on: On) => {
	const lines = logging(on, { decision: "ask", rule: "Bash(echo:*)" });
	await $.tool.check({
		tool: "Bash",
		input: { command: `echo ${"a".repeat(300)}` },
	});
	expect(parsedLines(lines)).toMatchObject([
		{ command: `echo ${"a".repeat(195)}` },
	]);
});

test("by default a compound head, a grep, and a Read of the held-out folder are denied over an allow", async ($: Engine, on: On) => {
	walledLab(on);
	const verdicts = [
		await run($, "Bash", {
			command: "cd /tmp; ls; head -c 1 ~/.claudetto-holdout/canary.txt",
		}),
		await run($, "Bash", {
			command: 'grep -c x "$HOME/.claudetto-holdout/canary.txt"',
		}),
		await run($, "Read", {
			file_path: "/home/u/.claudetto-holdout/canary.txt",
		}),
	];
	expect(verdicts.map((v) => v.decision)).toEqual(["deny", "deny", "deny"]);
});

test("a startup logs one line when the settings lack the wall's Read deny", async ($: Engine, on: On) => {
	const logs = walledLab(on);
	await start($);
	expect(logs.filter((l) => l.includes("walls off"))).toEqual([
		"claudetto walls off `~/.claudetto-holdout`, but your settings hold no `Read(~/.claudetto-holdout/**)` in `permissions.deny`, so only claudetto's gate keeps sessions out.",
	]);
});

test("a startup with the wall's Read deny in the settings logs nothing", async ($: Engine, on: On) => {
	const logs = walledLab(on, ["Read(~/.claudetto-holdout/**)"]);
	await start($);
	expect(logs.filter((l) => l.includes("walls off"))).toEqual([]);
});

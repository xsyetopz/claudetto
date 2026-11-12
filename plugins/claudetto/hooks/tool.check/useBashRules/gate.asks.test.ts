import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

import { asking, run, start, walledLab } from "./gate.mock";

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

import { expect, test } from "claude-code/testing";

import { valueAt } from "./settings";
import { everything, listOf } from "./settings.mock";

test("the command rules ask for a branch move, a worktree remove, a branch delete, and a push that deletes a ref", () => {
	const ask = valueAt(everything({}), ["permissions", "ask"]);

	for (const rule of [
		"Bash(git switch *)",
		"Bash(git checkout *)",
		"Bash(git worktree remove *)",
		"Bash(git branch -D *)",
		"Bash(git push * --delete *)",
		"Bash(git push * :**)",
		"Bash(git push :**)",
		"Bash(git push *--force*)",
		"Bash(git clean *)",
	]) {
		expect(ask).toContain(rule);
	}
});

test("pkill and killall are denied, and the ask list holds no pattern that ends in a legacy prefix suffix", () => {
	const written = everything({});

	expect(valueAt(written, ["permissions", "deny"])).toEqual(
		expect.arrayContaining(["Bash(pkill *)", "Bash(killall *)"]),
	);
	for (const rule of listOf(valueAt(written, ["permissions", "ask"]))) {
		expect(String(rule)).not.toMatch(/:\*\)$/u);
	}
});

test("the read-only allow list names no command that can write through a flag", () => {
	const allow = listOf(valueAt(everything({}), ["permissions", "allow"]));

	expect(allow).toContain("Bash(git status *)");
	for (const rule of ["Bash(rg *)", "Bash(echo *)", "Bash(git diff *)"]) {
		expect(allow).not.toContain(rule);
	}
});

import { expect, test } from "claude-code/testing";

import { valueAt } from "./settings";
import { everything, listOf } from "./settings.mock";

test("pkill and killall are denied, and the command rules write no ask rule", () => {
	const written = everything({});

	expect(valueAt(written, ["permissions", "deny"])).toEqual(
		expect.arrayContaining(["Bash(pkill *)", "Bash(killall *)"]),
	);
	expect(valueAt(written, ["permissions", "ask"])).toBeUndefined();
});

test("a rerun removes the ask rules an earlier setup wrote and keeps the user's own", () => {
	const held = {
		permissions: {
			ask: ["Bash(rm -*r*)", "Bash(git checkout *)", "Bash(docker push *)"],
			allow: ["Bash(ls)"],
		},
	};

	const written = everything(held);

	expect(valueAt(written, ["permissions", "ask"])).toEqual([
		"Bash(docker push *)",
	]);
	expect(valueAt(written, ["permissions", "allow"])).toContain("Bash(ls)");
});

test("the read-only allow list names no command that can write through a flag", () => {
	const allow = listOf(valueAt(everything({}), ["permissions", "allow"]));

	expect(allow).toContain("Bash(git status *)");
	for (const rule of ["Bash(rg *)", "Bash(echo *)", "Bash(git diff *)"]) {
		expect(allow).not.toContain(rule);
	}
});

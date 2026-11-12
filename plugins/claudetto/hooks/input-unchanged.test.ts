import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

import { repo } from "./gate.mock.ts";

// Auto mode reviews each call of a response before the hooks run, and a call whose input a hook changed loses the review of every call beside it. The stub stands for the engine beneath the plugin: it records the call each hook hands it.
const CALLS = [
	{ tool: "Bash", command: "echo one", description: "one" },
	{ tool: "Bash", command: "bun test", description: "tests" },
	{ tool: "Bash", command: "git status", description: "status" },
	{ tool: "Bash", command: "git commit -m x", description: "commit" },
	{ tool: "Bash", command: "ls -la | head", description: "list" },
	{ tool: "Read", file_path: "/p/a.txt" },
	{ tool: "Write", file_path: "/p/w.txt", content: "x\n" },
	{
		tool: "Edit",
		file_path: "/p/a.txt",
		old_string: "a",
		new_string: "b",
	},
	{ tool: "WebFetch", url: "https://example.com", prompt: "go" },
	{ tool: "Agent", description: "d", prompt: "p", subagent_type: "fork" },
	{
		tool: "Agent",
		description: "d",
		prompt: "p",
		subagent_type: "claudetto:work",
	},
	{
		tool: "Agent",
		description: "d",
		prompt: "p",
		subagent_type: "claudetto:search",
		run_in_background: false,
	},
] as const;

for (const sent of CALLS) {
	const name = JSON.stringify(sent).slice(0, 70);

	test(`tool.call hands the engine this input as sent: ${name}`, async ($: Engine, on: On) => {
		repo(on);
		on("session.root", () => ({ value: "/p" }));
		on("clock.now", () => ({ value: 0 }));
		const seen: unknown[] = [];
		on("tool.call", (_$, e) => {
			seen.push(e);
			return { result: "ok" };
		});

		await $.tool.call(sent);

		expect(seen).not.toHaveLength(0);
		for (const reached of seen) {
			expect(reached).toMatchObject(sent);
		}
	});

	test(`tool.check hands the engine this input as sent: ${name}`, async ($: Engine, on: On) => {
		repo(on);
		const seen: unknown[] = [];
		on("tool.check", (_$, e) => {
			seen.push(e);
			return { decision: "allow" };
		});
		const { tool, ...input } = sent;

		await $.tool.check({ tool, input });

		expect(seen).not.toHaveLength(0);
		for (const reached of seen) {
			expect(reached).toMatchObject({ tool, input });
		}
	});
}

// The plan of the code-compaction probe: each fork loads the plugin by an absolute path, and the H arm hands over in a new session.

import { expect, test } from "bun:test";
import path from "node:path";
import {
	handoffOf,
	messagesOf,
	plan,
	resumeOf,
} from "../../../dev/probe/main.ts";
import { pathExists } from "../helpers.ts";

const argsOf = (cmd: string[], flag: string): string[] =>
	cmd.flatMap((a, i) => (cmd[i - 1] === flag ? [a] : []));

test("Plugin Dir: each `--plugin-dir` argument is absolute and exists, because the run starts in a temp folder", async () => {
	const dirs = plan().flatMap((f) =>
		f.commands.flatMap((c) => argsOf(c, "--plugin-dir")),
	);
	expect(dirs).toHaveLength(plan().flatMap((f) => f.commands).length);
	expect(dirs.every((dir) => path.isAbsolute(dir))).toBe(true);
	const found = await Promise.all(
		dirs.map((dir) => pathExists(path.join(dir, ".claude-plugin"))),
	);
	expect(found.every(Boolean)).toBe(true);
});

test("Handover Arm: H starts a new session with the handoff prompt, and B and C compact a resumed one", () => {
	for (const f of plan()) {
		const [first = [], ...hops] = f.commands;
		expect(hops.every((c) => c.includes("$FORK"))).toBe(true);
		const handoff = f.arm === "H";
		expect(first[1]).toBe(handoff ? "$HANDOFF" : "/compact");
		expect(first.includes("--resume") && handoff).toBe(false);
		expect(first.includes("--fork-session")).toBe(!handoff);
	}
});

test("Handoff Prompt: the resume text holds the handoff of the base session, with its constraints", () => {
	const messages = messagesOf(
		["Pin `left-pad@1.3.0`. Do not touch `src/legacy.ts`."],
		[
			[
				{
					type: "assistant",
					message: {
						id: "m1",
						content: [
							{ type: "text", text: "Ok." },
							{
								type: "tool_use",
								id: "t1",
								name: "Write",
								input: { file_path: "/x/src/greet.ts" },
							},
						],
					},
				},
			],
		],
	);
	expect(messages.map((m) => m.role)).toEqual(["user", "assistant"]);
	const handoff = handoffOf(
		messages,
		"## 1. Work\n\n- [x] 1.1 a\n- [ ] 1.2 b\n",
	);
	const text = resumeOf(handoff, ".claude/claudetto/handoffs/h.md");
	expect(handoff).toContain("Do not touch `src/legacy.ts`.");
	expect(text).toContain(handoff);
	expect(text).toContain(".claude/claudetto/handoffs/h.md");
});

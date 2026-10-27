// The flags of the probe load the plugin from a temp folder (free check, a stub of the Messages API with a fake key).
// A fork of `claude -p /compact` with the option `code` must make 0 requests, because the plugin answers the compaction.
// Without the plugin, the built-in compaction makes a request. The run skips when `claude` is not on `PATH`.

import { expect, test } from "bun:test";
import { which } from "bun";
import { flags } from "../../../dev/probe/plan.ts";
import { PIN_RUNS_TIMEOUT_MS } from "../../../tools/limits.ts";
import { seedSession, stubCapture } from "../../support/stub-api.ts";

const SESSION = "22222222-2222-4222-8222-222222222222";

/** The saved rows of a session with 2 turns and filler that the tail budget cuts, as Claude Code writes them. */
const rowsOf = (cwd: string): string =>
	[
		"Pin `zod` to `3.23`.",
		"Ok.",
		"Do not touch `src/legacy.ts`.",
		"Understood.",
		...Array.from({ length: 6 }, (_, i) => `Filler ${i} ${"x".repeat(15_000)}`),
	]
		.map((text, i) => ({
			parentUuid:
				i === 0 ? null : `00000000-0000-4000-8000-00000000000${i - 1}`,
			isSidechain: false,
			userType: "external",
			cwd,
			sessionId: SESSION,
			version: "2.1.310",
			type: i % 2 ? "assistant" : "user",
			uuid: `00000000-0000-4000-8000-00000000000${i}`,
			timestamp: new Date(1_700_000_000_000 + i * 1000).toISOString(),
			message:
				i % 2
					? {
							id: `msg_${i}`,
							type: "message",
							role: "assistant",
							model: "claude-sonnet-5-5",
							content: [{ type: "text", text }],
							stop_reason: "end_turn",
							usage: { input_tokens: 1, output_tokens: 1 },
						}
					: { role: "user", content: text },
		}))
		.map((row) => JSON.stringify(row))
		.join("\n");

test(
	"Plugin Loads: the compaction fork of the probe, with option `code`, makes 0 requests from a temp folder",
	async () => {
		// Without `claude` on `PATH` there is no session to fork, so the test has nothing to check.
		if (which("claude") === null) {
			return;
		}
		const capture = await stubCapture(
			{},
			{
				prompt: "/compact",
				args: ["--resume", SESSION, "--fork-session", ...flags("C")],
				prepare: seedSession(SESSION, rowsOf),
			},
		);
		const done = capture.events.findLast((e) => e["type"] === "result");
		expect(capture.requests).toHaveLength(0);
		expect(done?.["subtype"]).toBe("success");
		expect(done?.["session_id"]).not.toBe(SESSION);
	},
	PIN_RUNS_TIMEOUT_MS,
);

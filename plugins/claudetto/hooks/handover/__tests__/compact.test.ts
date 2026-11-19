import type { ModelForkResult, On, SessionCompacted } from "claude-code";
import { describe, expect, test } from "claude-code/testing";

import { KEEP_LINE } from "../text";

const USAGE = { input_tokens: 1, output_tokens: 2, cache_read_input_tokens: 3, cache_creation_input_tokens: 4 };

function world(
	on: On,
	env: Record<string, string> = {},
	fork: ModelForkResult | Error = { isAnswered: true, text: "HANDOVER", usage: USAGE },
	settings: Record<string, unknown> = {},
	messages: () => { role: "user" | "assistant"; text: string; toolUses: never[] }[] = () => [{ role: "user", text: "fix the parser", toolUses: [] }],
) {
	const seen: unknown[] = [];
	const status: (string | undefined)[] = [];
	on("ui.status", (_$, e) => {
		status.push(e.text);
		return { value: undefined };
	});
	on("settings.read", () => ({ value: settings }));
	on("env.get", (_$, e) => ({ value: env[e.name] }));
	const requests: Record<string, unknown>[] = [];
	on("model.fork", (_$, e) => {
		requests.push(e as unknown as Record<string, unknown>);
		if (fork instanceof Error) throw fork;
		return { value: fork };
	});
	on("session.messages", () => ({ value: messages() }));
	on("session.usage", () => ({ value: { startedAt: 0, context: { tokens: 90000, window: 200000 }, rateLimits: [] } }));
	on("process.run", (_$, e) => ({ value: { exitCode: 0, stdout: e.argv[1] === "rev-parse" ? "abc1234\n" : "", stderr: "", isStdoutTruncated: false, isStderrTruncated: false } }));
	on("session.compact", (_$, e) => {
		seen.push(e);
		return { messages: [{ role: "user", text: "CORE", toolUses: [] }] };
	});
	return Object.assign(seen, { status, requests });
}

describe("session.compact", () => {
	test("auto compaction gets the handover and no core call", async ($, on) => {
		const seen = world(on);
		const r = await $.session.compact({ trigger: "auto", messages: [] });
		expect(seen.length).toBe(0);
		expect(r.messages?.[0]?.text).toContain("HANDOVER");
		expect(r.messages?.[0]?.text).toContain("git HEAD: abc1234");
		expect((r as SessionCompacted).tokensBefore).toBe(90000);
		expect((r as SessionCompacted).usage).toEqual(USAGE);
	});
	test("the prompt that opened the turn stays after the handover", async ($, on) => {
		world(on);
		const messages = [
			{ role: "user" as const, text: "old", toolUses: [] },
			{ role: "assistant" as const, text: "OK", toolUses: [] },
			{ role: "user" as const, text: "second one", toolUses: [] },
		];
		const r = await $.session.compact({ trigger: "auto", messages });
		expect(r.messages?.map((m) => m.text).slice(1)).toEqual(["second one"]);
	});
	test("a failed fork falls back to the transcript extract", async ($, on) => {
		world(on, {}, { isAnswered: false, reason: "nothing-to-fork" });
		const r = await $.session.compact({ trigger: "plugin", messages: [] });
		expect(r.messages?.[0]?.text).toContain("- fix the parser");
	});
	test("a throwing fork leaves one debug line and still hands over", async ($, on) => {
		// Arrange
		world(on, {}, new Error("overloaded"));
		const lines: string[] = [];
		on("ui.log", (_$, e) => {
			lines.push(`${e.to}: ${e.text}`);
			return { value: undefined };
		});

		// Act
		const r = await $.session.compact({ trigger: "auto", messages: [] });

		// Assert
		expect(lines.length).toBe(1);
		expect(lines[0]).toStartWith("debug: claudetto handover fork failed:");
		expect(r.messages?.[0]?.text).toContain("- fix the parser");
	});
	test("manual compaction keeps core and appends the keep line", async ($, on) => {
		const seen = world(on);
		const r = await $.session.compact({ trigger: "manual", instructions: "focus", messages: [{ role: "user", text: "hi", toolUses: [] }] });
		expect(r.messages?.[0]?.text).toBe("CORE");
		expect((seen[0] as { instructions: string }).instructions).toContain(`focus\n${KEEP_LINE}`);
	});
	test("a subagent compaction takes the core path", async ($, on) => {
		const seen = world(on);
		await $.session.compact({ trigger: "auto", agentId: "a1", messages: [] });
		expect(seen.length).toBe(1);
	});
	test("three compactions in a row carry a stated requirement and inject no growing text", async ($, on) => {
		// Arrange: the free extract writes each handover, so the fixture runs no model.
		let rows = [{ role: "user" as const, text: "Requirement: keep the public API unchanged.", toolUses: [] }];
		world(on, {}, { isAnswered: false, reason: "nothing-to-fork" }, {}, () => rows);
		const sizes: number[] = [];

		// Act
		for (let i = 0; i < 3; i++) {
			const r = await $.session.compact({ trigger: "auto", messages: [] });
			const text = r.messages?.[0]?.text ?? "";
			sizes.push(text.length);
			rows = [{ role: "user", text, toolUses: [] }];
		}

		// Assert
		expect(rows[0]?.text).toContain("keep the public API unchanged");
		expect(sizes[2]).toBe(sizes[0]);
	});
	test("a status line shows while the fork writes and clears after", async ($, on) => {
		// Arrange
		const { status } = world(on);

		// Act
		await $.session.compact({ trigger: "auto", messages: [] });

		// Assert
		expect(status).toEqual(["Writing handover…", undefined]);
	});
	test("autoHandoverEnabled false leaves auto compaction to core", async ($, on) => {
		// Arrange
		const seen = world(on, {}, undefined, { autoHandoverEnabled: false });

		// Act
		await $.session.compact({ trigger: "auto", messages: [] });

		// Assert
		expect(seen.length).toBe(1);
	});
	test("precomputeHandoverEnabled false leaves only the precompute to core", async ($, on) => {
		// Arrange
		const seen = world(on, {}, undefined, { precomputeHandoverEnabled: false });

		// Act
		await $.session.compact({ trigger: "precompute", messages: [] });
		const auto = await $.session.compact({ trigger: "auto", messages: [] });

		// Assert
		expect(seen.length).toBe(1);
		expect(auto.messages?.[0]?.text).toContain("HANDOVER");
	});
	test("auto handover off leaves auto compaction to core", async ($, on) => {
		const seen = world(on, { CLAUDETTO_DISABLE_AUTO_HANDOVER: "1" });
		await $.session.compact({ trigger: "auto", messages: [] });
		expect(seen.length).toBe(1);
	});
	test("a fork that returns empty text takes the extract and bills no fork cost", async ($, on) => {
		// Arrange
		world(on, {}, { isAnswered: true, text: "  ", usage: USAGE });

		// Act
		const r = await $.session.compact({ trigger: "auto", messages: [] });

		// Assert
		expect(r.messages?.[0]?.text).toContain("- fix the parser");
		expect((r as SessionCompacted).usage).toEqual({ input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 });
	});
	test("a throwing fork bills no fork cost and the status line still clears", async ($, on) => {
		// Arrange
		const { status } = world(on, {}, new Error("overloaded"));
		on("ui.log", () => ({ value: undefined }));

		// Act
		const r = await $.session.compact({ trigger: "auto", messages: [] });

		// Assert
		expect((r as SessionCompacted).usage).toEqual({ input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 });
		expect(status).toEqual(["Writing handover…", undefined]);
	});
	test("CLAUDETTO_DISABLE_HANDOVER leaves automatic and manual compaction to core with no fork", async ($, on) => {
		// Arrange
		const seen = world(on, { CLAUDETTO_DISABLE_HANDOVER: "1" });

		// Act
		const auto = await $.session.compact({ trigger: "auto", messages: [] });
		await $.session.compact({ trigger: "manual", messages: [] });

		// Assert
		expect(auto.messages?.[0]?.text).toBe("CORE");
		expect(seen.length).toBe(2);
		expect(seen.status).toEqual([]);
		expect((seen[1] as { instructions?: string }).instructions).toBeUndefined();
	});
	test("a manual compaction reaches core with trigger manual and is not skipped", async ($, on) => {
		const seen = world(on);
		const r = await $.session.compact({ trigger: "manual", messages: [{ role: "user", text: "hi", toolUses: [] }] });
		expect((seen[0] as { trigger: string }).trigger).toBe("manual");
		expect((r as { skipped?: unknown }).skipped).toBeUndefined();
	});
	test("the handover fork asks for low effort and names no model", async ($, on) => {
		// Arrange
		const { requests } = world(on);

		// Act
		await $.session.compact({ trigger: "auto", messages: [] });

		// Assert
		expect(requests.length).toBe(1);
		expect(requests[0]?.["effort"]).toBe("low");
		expect("model" in (requests[0] ?? {})).toBe(false);
		expect(String(requests[0]?.["prompt"])).toContain("Constraints:");
	});
});

import type { ModelForkResult, On } from "claude-code";
import { describe, expect, test } from "claude-code/testing";

const FORK: ModelForkResult = {
	isAnswered: true,
	text: "HANDOVER",
	usage: {
		input_tokens: 1,
		output_tokens: 1,
		cache_read_input_tokens: 0,
		cache_creation_input_tokens: 0
	}
};

/** Serves a fork that writes "HANDOVER" and a clean git tree to the compaction hook. */
const serve = (on: On): void => {
	on("settings.read", () => ({ value: {} }));
	on("env.get", () => ({ value: undefined }));
	on("ui.status", () => ({ value: undefined }));
	on("model.fork", () => ({ value: FORK }));
	on("session.messages", () => ({
		value: [{ role: "user", text: "fix the parser", toolUses: [] }]
	}));
	on("session.usage", () => ({
		value: {
			startedAt: 0,
			context: { tokens: 90_000, window: 200_000 },
			rateLimits: []
		}
	}));
	on("process.run", () => ({
		value: {
			exitCode: 0,
			stdout: "",
			stderr: "",
			isStdoutTruncated: false,
			isStderrTruncated: false
		}
	}));
};

describe("handover resume", () => {
	test("HANDOVER-074 a mid-turn compaction's handover goes on with a resume instruction a turn-boundary one leaves out", async ($, on) => {
		// Arrange
		serve(on);

		// Act
		const auto = await $.session.compact({ trigger: "auto", messages: [] });
		const boundary = await $.session.compact({
			trigger: "plugin",
			messages: []
		});

		// Assert
		const resumed = auto.messages?.[0]?.text ?? "";
		const plain = boundary.messages?.[0]?.text ?? "";
		expect(plain).toContain("HANDOVER");
		expect(resumed.startsWith(plain)).toBe(true);
		expect(resumed.length).toBeGreaterThan(plain.length);
	});
});

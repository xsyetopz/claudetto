import { describe, expect, test } from "claude-code/testing";

import { registerTranscript } from "../register";

const call = (tool: string, input: unknown, flags = {}) => ({
	tool,
	input,
	isRunning: false,
	isErrored: false,
	isInterrupted: false,
	...flags
});

describe("terminal transcript rows", () => {
	test("TRANSCRIPT-001 a message typed in the composer is drawn in the claude colour", async ($, on) => {
		// Arrange
		const props = {
			text: "fix the build",
			origin: { kind: "composer" as const },
			isExpanded: false
		};

		// Act
		registerTranscript(on);
		const ui = await $.ui.mount({
			plugin: "engine",
			surface: "terminal",
			component: "UserMessage",
			requestId: "r1",
			props
		});

		// Assert
		expect(
			await ui.find({ type: "Text", text: /❯ fix the build/u })
		).toMatchObject({
			props: { color: "claude" }
		});
	});

	test("TRANSCRIPT-002 a failed Bash call is one row that says failed and how to expand", async ($, on) => {
		// Arrange
		const props = {
			tool_use_id: "t1",
			...call("Bash", { command: "git status --short" }, { isErrored: true })
		};

		// Act
		registerTranscript(on);
		const ui = await $.ui.mount({
			plugin: "engine",
			surface: "terminal",
			component: "ToolUse",
			requestId: "r1",
			props
		});

		// Assert
		expect(
			await ui.find({ text: /Ran 1 command \(git status --short\)/u })
		).toBeDefined();
		expect(
			await ui.find({ type: "Text", text: /failed \(ctrl\+o to expand\)/u })
		).toMatchObject({ props: { color: "error" } });
	});

	test("TRANSCRIPT-003 a calls-only group counts its calls per verb and folds equal subjects", async ($, on) => {
		// Arrange
		const props = {
			isActive: false,
			isExpanded: false,
			isCallsOnly: true,
			calls: [
				call("Read", { file_path: "/x/a.ts" }),
				call("mcp__claudetto__read", { file_path: "/x/b.ts" }),
				call("Read", { file_path: "/y/b.ts" }),
				call("Grep", { pattern: "foo" })
			]
		};

		// Act
		registerTranscript(on);
		const ui = await $.ui.mount({
			plugin: "engine",
			surface: "terminal",
			component: "ToolGroup",
			requestId: "r1",
			props
		});

		// Assert
		expect(
			await ui.find({
				text: /Read 3 files \(a\.ts · b\.ts ×2\), searched 1 pattern \(foo\)/u
			})
		).toBeDefined();
	});

	test("TRANSCRIPT-004 a collapsed tool result draws nothing", async ($, on) => {
		// Arrange
		const props = {
			tool_use_id: "t1",
			tool: "Bash",
			output: "ok",
			isErrored: false,
			isExpanded: false
		};

		// Act
		registerTranscript(on);
		const ui = await $.ui.mount({
			plugin: "engine",
			surface: "terminal",
			component: "ToolResult",
			requestId: "r1",
			props
		});

		// Assert
		expect(await ui.find({ text: /ok/u })).toBeUndefined();
		expect(await ui.find({ type: "Text" })).toBeUndefined();
	});

	test("TRANSCRIPT-005 an expanded tool call keeps the engine's drawing", async ($, on) => {
		// Arrange
		const props = {
			tool_use_id: "t1",
			...call("Bash", { command: "git status" }),
			isExpanded: true
		};

		// Act
		registerTranscript(on);
		const ui = await $.ui.mount({
			plugin: "engine",
			surface: "terminal",
			component: "ToolUse",
			requestId: "r1",
			props
		});

		// Assert
		expect(await ui.find({ text: /Ran 1 command/u })).toBeUndefined();
	});
});

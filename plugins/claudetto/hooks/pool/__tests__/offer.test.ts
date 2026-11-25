import { describe, expect, test, type TestBody } from "claude-code/testing";

import { TOOL_FULL_NAME } from "../../patch/texts";
import { TOOL_FULL_NAME as READ_FULL_NAME } from "../../read/texts";
import { registerToolOffer } from "../offer";

type Dollar = Parameters<TestBody>[0];
type Mocks = Parameters<TestBody>[1];

const provider = { plugin: "engine", tier: "core" } as const;
const SUBAGENT = { agentId: "a1", subagentType: "Heracles" } as const;

/** Whether the engine offers each tool, in the main loop or in a subagent's. */
const offered = async (
	$: Dollar,
	on: Mocks,
	tools: readonly string[],
	inSubagent: boolean
): Promise<boolean[]> => {
	on("tool.offer", () => ({ isOffered: true }));
	registerToolOffer(on);
	const answers = await Promise.all(
		tools.map((tool) =>
			$.tool.offer({ tool, provider, ...(inSubagent ? SUBAGENT : {}) })
		)
	);
	return answers.map((a) => a.isOffered);
};

const REPLACED = ["Write", "Edit", "NotebookEdit", "Read"];
const MESSAGING = ["SendMessage", "ListAgents"];
const WORKER_HIDDEN = [
	"Monitor",
	"TaskStop",
	"mcp__claudetto__set_goal",
	"mcp__claudetto__get_goal",
	"mcp__claudetto__pause_goal",
	"mcp__claudetto__clear_goal"
];

describe("tool.offer", () => {
	test("hides the built-in file tools in the main loop, which patch and read replace", async ($, on) => {
		// Act
		const answers = await offered($, on, REPLACED, false);

		// Assert
		expect(answers.every((o) => !o)).toBe(true);
	});

	test("hides the built-in file tools in a subagent's loop", async ($, on) => {
		// Act
		const answers = await offered($, on, REPLACED, true);

		// Assert
		expect(answers.every((o) => !o)).toBe(true);
	});

	test("offers SendMessage and ListAgents in the main loop", async ($, on) => {
		// Act
		const answers = await offered($, on, MESSAGING, false);

		// Assert
		expect(answers.every(Boolean)).toBe(true);
	});

	test("hides SendMessage and ListAgents in a subagent's loop", async ($, on) => {
		// Act
		const answers = await offered($, on, MESSAGING, true);

		// Assert
		expect(answers.every((o) => !o)).toBe(true);
	});

	test("offers Monitor, TaskStop and the goal tools in the main loop", async ($, on) => {
		// Act
		const answers = await offered($, on, WORKER_HIDDEN, false);

		// Assert
		expect(answers.every(Boolean)).toBe(true);
	});

	test("hides Monitor, TaskStop and the goal tools in a subagent's loop", async ($, on) => {
		// Act
		const answers = await offered($, on, WORKER_HIDDEN, true);

		// Assert
		expect(answers.every((o) => !o)).toBe(true);
	});

	test("keeps Bash, Agent, patch and read", async ($, on) => {
		// Act
		const answers = await offered(
			$,
			on,
			["Bash", "Agent", TOOL_FULL_NAME, READ_FULL_NAME],
			false
		);

		// Assert
		expect(answers.every(Boolean)).toBe(true);
	});
});

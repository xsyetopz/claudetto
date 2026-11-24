import type { SessionAppendInput } from "claude-code";
import { describe, expect, test } from "claude-code/testing";

const FEEDBACK = "Stop hook feedback:\n[x exists]: nope";

const row: SessionAppendInput = {
	door: "note",
	origin: { kind: "engine" },
	uuid: "u-block",
	message: { type: "user", content: [{ type: "text", text: FEEDBACK }] }
};

describe("goal tools note", () => {
	test("the goal's first block row names the goal tools, and later rows do not", async ($, on) => {
		// Arrange
		// RISK-531: under -p the set-time context never reaches the model.
		on("command.run", (_$, e) => ({ text: `Goal set: ${e.args}` }));
		on("session.cwd", () => ({ value: "/work" }));
		on("fs.exists", () => ({ value: true }));
		on("env.get", () => ({ value: undefined }));
		await $.command.run({
			command: "goal",
			args: "x exists",
			origin: { kind: "composer" },
			presentation: { isFullscreen: false, columns: 80 }
		});

		// Act
		const first = await $.session.append(row);
		const second = await $.session.append(row);

		// Assert
		expect(JSON.stringify(first.message?.content)).toContain("clear_goal");
		expect(JSON.stringify(second.message?.content)).not.toContain("claudetto");
	});
});

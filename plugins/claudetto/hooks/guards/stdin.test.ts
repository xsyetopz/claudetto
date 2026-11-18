import { describe, expect, test } from "claude-code/testing";

import { registerStdin } from "./stdin";

describe("stdin guard", () => {
	test("a Bash call reaches the tool with stdin from /dev/null and its heredoc intact", async ($, on) => {
		// Arrange
		registerStdin(on);
		const seen: string[] = [];
		on("tool.call", { tool: "Bash" }, (_$, e) => {
			if (e.tool === "Bash") seen.push(e.command);
			return { result: "ok" } as never;
		});

		// Act
		await $.tool.call({ tool: "Bash", command: "cat <<EOF\nhi\nEOF" });

		// Assert
		expect(seen).toEqual(["{ cat <<EOF\nhi\nEOF\n} </dev/null"]);
	});
});

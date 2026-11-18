import { describe, expect, test } from "claude-code/testing";

import { gateCommit, registerCommit } from "./commit";

describe("commit gate", () => {
	test("a command that commits after a piped check runs with pipefail", async ($, on) => {
		// Arrange
		registerCommit(on);
		const seen: string[] = [];
		on("tool.call", { tool: "Bash" }, (_$, e) => {
			if (e.tool === "Bash") seen.push(e.command);
			return { result: "ok" } as never;
		});

		// Act
		await $.tool.call({ tool: "Bash", command: "bun test | tail -3 && git commit -m x" });

		// Assert
		expect(seen).toEqual(["set -o pipefail\nbun test | tail -3 && git commit -m x"]);
	});

	test("a command that neither commits nor pushes stays as written", () => {
		// Act and Assert
		expect(gateCommit("grep -c x a | head -1")).toBe("grep -c x a | head -1");
	});

	test("a push with a global option before it is gated", () => {
		// Act and Assert
		expect(gateCommit("git -C repo push origin main")).toStartWith("set -o pipefail\n");
	});
});

import { describe, expect, test } from "claude-code/testing";

import { gateCommit } from "./commit";

describe("commit gate", () => {
	test("turns on pipefail for a commit after a piped check", () => {
		// Act and Assert
		expect(gateCommit("bun test | tail -3 && git commit -m x")).toBe("set -o pipefail\nbun test | tail -3 && git commit -m x");
	});

	test("leaves a command that neither commits nor pushes as written", () => {
		// Act and Assert
		expect(gateCommit("grep -c x a | head -1")).toBe("grep -c x a | head -1");
	});

	test("gates a push with a global option before it", () => {
		// Act and Assert
		expect(gateCommit("git -C repo push origin main")).toStartWith("set -o pipefail\n");
	});
});

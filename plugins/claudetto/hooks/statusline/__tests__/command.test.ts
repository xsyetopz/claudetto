import { describe, expect, test } from "claude-code/testing";

import { requestOf, statuslineEdit } from "../command";

describe("statusline edit text", () => {
	test("carries the user's request from the stock text", () => {
		// Arrange
		const stock = 'Create an Agent with subagent_type "statusline-setup" and the prompt "show git branch"';

		// Act and Assert
		expect(requestOf(stock)).toBe("show git branch");
	});

	test("names the settings file and carries the request", () => {
		// Act
		const text = statuslineEdit('the prompt "x"', "/cfg/settings.json");

		// Assert
		expect(text).toContain("@/cfg/settings.json");
		expect(text.split("\n")[0]).toEndWith(": x");
	});
});

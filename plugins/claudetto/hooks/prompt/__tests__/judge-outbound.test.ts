import { expect, test } from "claude-code/testing";

import { outbound } from "../judge";

test("a token in any state field is masked before it leaves for Jev", () => {
	// Arrange
	const state = {
		prompt: "deploy with ghp_abcdefghijklmnopqrstuvwxyz0123456789 now",
		after: "Authorization: Bearer abcdefgh12345678"
	};

	// Act
	const sent = outbound(state);

	// Assert
	expect(sent.prompt).toBe("deploy with [REDACTED] now");
	expect(sent.after).not.toContain("abcdefgh12345678");
});

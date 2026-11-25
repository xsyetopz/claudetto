import { describe, expect, test } from "claude-code/testing";

import { isAnthropicHost, leavesAnthropic, withoutLogin } from "../base-url";

const REQUEST_HEADERS = {
	Authorization: "[redacted]",
	"x-api-key": "[redacted]",
	"anthropic-version": "2023-06-01"
};

const request = (url: string) => ({
	url,
	init: { method: "POST", headers: REQUEST_HEADERS, body: "{}" }
});

describe("a model request to a host other than Anthropic's (RISK-405)", () => {
	test("Anthropic hosts are told apart from a custom base URL", () => {
		// Act and Assert
		expect(isAnthropicHost("https://api.anthropic.com/v1/messages")).toBe(true);
		expect(isAnthropicHost("https://claude.ai/api")).toBe(true);
		expect(isAnthropicHost("http://127.0.0.1:8080/v1/messages")).toBe(false);
		expect(isAnthropicHost("https://anthropic.com.example.net/v1")).toBe(false);
		expect(isAnthropicHost("not a url")).toBe(false);
	});

	test("a request to a custom base URL leaves Anthropic; one to Anthropic does not", () => {
		// Act and Assert
		expect(leavesAnthropic(request("http://127.0.0.1:8080/v1/messages"))).toBe(
			true
		);
		expect(
			leavesAnthropic(request("https://api.anthropic.com/v1/messages"))
		).toBe(false);
		expect(leavesAnthropic({ url: "http://127.0.0.1:8080/v1" })).toBe(false);
	});

	test("the request goes on without its credential and keeps the rest", () => {
		// Arrange
		const sent = request("http://127.0.0.1:8080/v1/messages");

		// Act
		const out = withoutLogin(sent);

		// Assert
		expect(out).toEqual({
			url: "http://127.0.0.1:8080/v1/messages",
			init: {
				method: "POST",
				headers: { "anthropic-version": "2023-06-01" },
				body: "{}"
			}
		});
	});
});

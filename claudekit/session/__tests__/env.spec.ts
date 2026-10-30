import { describe, expect, test } from "bun:test";
import { baseUrlEnv, fakeApiEnv, QUIET_ENV } from "../env.ts";

describe("fakeApiEnv", () => {
	test("points the session at the fake API and its own config folder", () => {
		const env = fakeApiEnv("http://127.0.0.1:1", "/c");

		expect(env["ANTHROPIC_BASE_URL"]).toBe("http://127.0.0.1:1");
		expect(env["CLAUDE_CONFIG_DIR"]).toBe("/c");
		expect(env["ANTHROPIC_API_KEY"]).toBe("sk-ant-fake");
	});

	test("turns reporting and updates off", () => {
		const env = fakeApiEnv("http://127.0.0.1:1", "/c");

		expect(env).toMatchObject(QUIET_ENV);
		expect(QUIET_ENV).toEqual({
			DISABLE_TELEMETRY: "1",
			DISABLE_ERROR_REPORTING: "1",
			DISABLE_AUTOUPDATER: "1",
		});
	});
});

describe("baseUrlEnv", () => {
	test("sets only the base URL", () => {
		expect(baseUrlEnv("http://x")).toEqual({ ANTHROPIC_BASE_URL: "http://x" });
	});
});

import { describe, expect, test } from "bun:test";
import {
	baseUrlEnv,
	fakeApiEnv,
	QUIET_ENV,
	withoutSessionVariables,
} from "../env.ts";

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
	});
});

describe("baseUrlEnv", () => {
	test("sets only the base URL", () => {
		expect(baseUrlEnv("http://x")).toEqual({ ANTHROPIC_BASE_URL: "http://x" });
	});
});

describe("withoutSessionVariables", () => {
	test("drops what a running session hands its tools, so a child session starts as stock", () => {
		const env = withoutSessionVariables({
			CLAUDECODE: "1",
			CLAUDE_CODE_DISABLE_CRON: "1",
			CLAUDE_CODE_SESSION_ID: "s",
			CLAUDE_CODE_FORK_SUBAGENT: "1",
			CLAUDE_AUTOCOMPACT_PCT_OVERRIDE: "70",
			CLAUDE_EFFORT: "high",
			CLAUDE_PID: "1",
			AI_AGENT: "claude-code",
		});

		expect(env).toEqual({});
	});

	test("keeps the login, the config folder, the provider switches, and the rest of the shell", () => {
		const kept = {
			PATH: "/bin",
			HOME: "/h",
			ANTHROPIC_API_KEY: "k",
			CLAUDE_CODE_OAUTH_TOKEN: "t",
			CLAUDE_CONFIG_DIR: "/c",
			CLAUDE_CODE_USE_BEDROCK: "1",
			DISABLE_TELEMETRY: "1",
		};

		expect(withoutSessionVariables({ ...kept, CLAUDECODE: "1" })).toEqual(kept);
	});

	test("drops a variable with no value", () => {
		expect(withoutSessionVariables({ PATH: undefined })).toEqual({});
	});
});

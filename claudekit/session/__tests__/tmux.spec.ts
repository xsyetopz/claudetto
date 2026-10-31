import { describe, expect, test } from "bun:test";
import { interactiveConfig, tmuxArgv } from "../tmux.ts";

describe("interactiveConfig", () => {
	test("skips onboarding, trusts the folder, and approves the key by its last 20 characters", () => {
		const key = "sk-ant-0123456789abcdefghijKLMN";

		expect(JSON.parse(interactiveConfig("/private/tmp/x/work", key))).toEqual({
			hasCompletedOnboarding: true,
			theme: "dark",
			customApiKeyResponses: {
				approved: ["456789abcdefghijKLMN"],
				rejected: [],
			},
			projects: { "/private/tmp/x/work": { hasTrustDialogAccepted: true } },
		});
	});
});

describe("tmuxArgv", () => {
	test("names its own socket, so the user's `tmux` server is never touched", () => {
		expect(tmuxArgv("/tmp/r/tmux.sock", "kill-server")).toEqual([
			"tmux",
			"-S",
			"/tmp/r/tmux.sock",
			"kill-server",
		]);
	});
});

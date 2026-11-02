import { describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { file, which } from "bun";
import { interactiveConfig, runInTmux, tmuxArgv } from "../tmux.ts";

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

describe.if(which("tmux") !== null)("runInTmux", () => {
	test("returns only after the pane process has exited, so a write it makes on hangup lands before the caller removes its folder", async () => {
		const root = await mkdtemp(join(tmpdir(), "tmux-spec-"));
		const late = join(root, "late");
		const script = `trap 'sleep 1; touch ${late}; exit 0' HUP; echo '❯'; while :; do sleep 0.1; done`;
		try {
			await runInTmux({
				argv: ["/bin/sh", "-c", script],
				cwd: root,
				env: {},
				socket: join(root, "tmux.sock"),
				prompt: "",
				done: () => true,
				timeoutMs: 10_000,
			});

			expect(await file(late).exists()).toBe(true);
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	}, 20_000);
});

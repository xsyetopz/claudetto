import type { On, SessionUsage } from "claude-code";
import { describe, expect, mock, test } from "claude-code/testing";

import { serve } from "./serve";

/** Serves the calls the whole session start makes, with `usage` as the session usage answer. */
const serveStart = (
	on: On,
	usage: () => SessionUsage | Promise<SessionUsage>
) => {
	const store = new Map<string, unknown>();
	on("session.start", (_$, e) => ({ cwd: e.cwd }));
	on("session.usage", async () => ({ value: await usage() }));
	on("tool.register", (_$, e) => ({ value: { tool: e.name } }));
	on("settings.read", () => ({ value: {} }));
	on("fs.exists", () => ({ value: false }));
	on("fs.read", () => ({ value: "" }));
	on("store.get", (_$, e) => ({ value: store.get(e.key) }));
	on("store.set", (_$, e) => {
		store.set(e.key, e.value);
		return { value: undefined };
	});
	on("ui.log", () => ({ value: undefined }));
	on("command.run", () => ({ text: "Reloaded" }));
};

describe("live state at session start", () => {
	test("SETUP-073 session start returns while the usage read never answers", async ($, on) => {
		// Arrange
		const clock = mock.clock(on);
		on("env.get", () => ({ value: undefined }));
		on("session.id", () => ({ value: "s1" }));
		on("fs.write", () => ({ value: undefined }));
		serveStart(
			on,
			() =>
				new Promise<never>(() => {
					// never answers
				})
		);

		// Act
		const started = $.session.start({
			cwd: "/repo",
			surface: null,
			isInteractive: true
		});
		// 5 s for the usage read's cap, then 3 s for the settings fill's load wait, which runs after it.
		await clock.advance(5000);
		await clock.advance(3000);

		// Assert
		expect(await started).toMatchObject({ cwd: "/repo" });
	});

	test("session start writes the state file, also when the usage read fails, so the status line draws", async ($, on) => {
		// Arrange
		const state = serve(on);
		serveStart(on, () => {
			throw new Error("usage unavailable");
		});

		// Act
		await $.session.start({ cwd: "/repo", surface: null, isInteractive: true });

		// Assert
		expect(state()?.phase).toBe("idle");
	});

	test("session start records the auto-compact window, so the first status line fills toward it", async ($, on) => {
		// Arrange
		const state = serve(on);
		serveStart(on, () => ({
			startedAt: 1_000_000,
			rateLimits: [],
			context: {
				window: 1_000_000,
				breakdown: {
					categories: [],
					totalTokens: 0,
					maxTokens: 300_000,
					rawMaxTokens: 300_000,
					autocompactSource: "settings",
					percentage: 0,
					gridRows: [],
					model: "claude-opus-5-5",
					memoryFiles: [],
					mcpTools: [],
					agents: [],
					isAutoCompactEnabled: true,
					apiUsage: null
				}
			}
		}));

		// Act
		await $.session.start({ cwd: "/repo", surface: null, isInteractive: true });

		// Assert
		expect(state()?.window).toBe(300_000);
	});
});

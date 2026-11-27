import type { On } from "claude-code";
import { describe, expect, test } from "claude-code/testing";

import { fieldOf } from "../../shared/field";

/** Serves a home folder with `files` by path to a session start; returns a reader of the settings written. */
const serve = (on: On, files: Record<string, string>) => {
	const store = new Map<string, unknown>();
	on("session.start", (_$, e) => ({ cwd: e.cwd }));
	on("tool.register", (_$, e) => ({ value: { tool: e.name } }));
	on("env.get", (_$, e) => ({
		value: e.name === "HOME" ? "/home/u" : undefined
	}));
	on("settings.read", () => ({ value: {} }));
	on("fs.exists", (_$, e) => ({ value: e.path in files }));
	on("fs.read", (_$, e) => ({ value: files[e.path] ?? "" }));
	on("fs.list", () => ({ value: [] }));
	on("fs.write", (_$, e) => {
		files[e.path] = e.text;
		return { value: undefined };
	});
	on("store.get", (_$, e) => ({ value: store.get(e.key) }));
	on("store.set", (_$, e) => {
		store.set(e.key, e.value);
		return { value: undefined };
	});
	on("ui.log", () => ({ value: undefined }));
	on("command.run", () => ({ text: "Reloaded" }));
	return (): unknown =>
		fieldOf(
			fieldOf(
				JSON.parse(files["/home/u/.claude/settings.json"] ?? "{}"),
				"env"
			),
			"CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS"
		);
};

const START = { cwd: "/home/u/p", surface: null, isInteractive: true } as const;

const account = (fields: Record<string, string>): string =>
	JSON.stringify({ oauthAccount: fields });

describe("SETUP-076 settings sized by the plan", () => {
	test("a Pro login runs two subagents at once", async ($, on) => {
		// Arrange
		const concurrent = serve(on, {
			"/home/u/.claude.json": account({ organizationType: "claude_pro" })
		});

		// Act
		await $.session.start(START);

		// Assert
		expect(concurrent()).toBe("2");
	});

	test("a Max 20x login runs five subagents at once", async ($, on) => {
		// Arrange
		const concurrent = serve(on, {
			"/home/u/.claude.json": account({
				organizationType: "claude_max",
				organizationRateLimitTier: "default_claude_max_20x"
			})
		});

		// Act
		await $.session.start(START);

		// Assert
		expect(concurrent()).toBe("5");
	});

	test("a session with no login record runs three", async ($, on) => {
		// Arrange
		const concurrent = serve(on, {});

		// Act
		await $.session.start(START);

		// Assert
		expect(concurrent()).toBe("3");
	});

	test("a plan change after the fill sizes the next start for the new plan", async ($, on) => {
		// Arrange
		const files: Record<string, string> = {
			"/home/u/.claude.json": account({ organizationType: "claude_pro" })
		};
		const concurrent = serve(on, files);
		await $.session.start(START);
		files["/home/u/.claude.json"] = account({
			organizationType: "claude_max",
			organizationRateLimitTier: "default_claude_max_20x"
		});

		// Act
		await $.session.start(START);

		// Assert
		expect(concurrent()).toBe("5");
	});
});

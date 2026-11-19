import type { On } from "claude-code";
import { describe, expect, test } from "claude-code/testing";

import { GIT_CONFLICT, gitBlock } from "./instructions";

const BASE = "Executes a bash command and returns its output.";

/** Stands in for the engine's settings and env, and records what the session logs. */
const engine = (on: On, settings: Record<string, unknown>, env: Record<string, string> = {}) => {
	const logged: string[] = [];
	on("tool.describe", (_$, e) => ({ description: e.description }) as never);
	on("settings.read", (_$, e) => ({ value: e.key === undefined ? settings : settings[e.key] }) as never);
	on("env.get", (_$, e) => ({ value: env[e.name] }) as never);
	on("ui.log", (_$, e) => {
		logged.push(e.text);
		return { value: undefined } as never;
	});
	return logged;
};

describe("git block", () => {
	test("carries the commit and pull request lines from settings", () => {
		// Act
		const block = gitBlock({ commit: "Assisted-by: X", pr: "Made with X" });

		// Assert
		expect(block).toContain("# Git");
		expect(block).toContain("- End each commit message with the line `Assisted-by: X`.");
		expect(block).toContain("- End each pull request description with the line `Made with X`.");
	});

	test("puts a multi-line attribution below its bullet", () => {
		// Act
		const block = gitBlock({ commit: "Line one\n\nLine two" });

		// Assert
		expect(block).toContain("- End each commit message with these lines:\nLine one\n\nLine two");
	});

	test("adds no attribution bullet for an unset or empty value", () => {
		// Act
		const unset = gitBlock(undefined);
		const empty = gitBlock({ commit: "", pr: "" });

		// Assert
		for (const block of [unset, empty]) expect(block).not.toContain("End each");
	});
});

describe("git instructions", () => {
	test("the Bash description carries claudetto's block when the builtin one is off", async ($, on) => {
		// Arrange
		engine(on, { includeGitInstructions: false, attribution: { commit: "Assisted-by: X", pr: "Made with X" } });

		// Act
		const { description } = await $.tool.describe({ tool: "Bash", description: BASE, provider: { plugin: "engine", tier: "core" } } as never);

		// Assert
		expect(description).toBe(`${BASE}${gitBlock({ commit: "Assisted-by: X", pr: "Made with X" })}`);
	});

	test("the Bash description stays as the engine wrote it when the builtin block is on", async ($, on) => {
		// Arrange
		engine(on, { attribution: { commit: "Assisted-by: X" } });

		// Act
		const { description } = await $.tool.describe({ tool: "Bash", description: BASE, provider: { plugin: "engine", tier: "core" } } as never);

		// Assert
		expect(description).toBe(BASE);
	});

	test("an env value that turns the builtin block off wins over the setting", async ($, on) => {
		// Arrange
		engine(on, { includeGitInstructions: true }, { CLAUDE_CODE_DISABLE_GIT_INSTRUCTIONS: "1" });

		// Act
		const { description } = await $.tool.describe({ tool: "Bash", description: BASE, provider: { plugin: "engine", tier: "core" } } as never);

		// Assert
		expect(description).toContain("# Git");
	});

	test("session start reports the conflict when the builtin block is turned back on", async ($, on) => {
		// Arrange
		const logged = engine(on, { includeGitInstructions: true }, { HOME: "/home/u" });
		on("session.start", (_$, e) => e as never);
		on("fs.exists", () => ({ value: true }) as never);
		on("fs.read", () => ({ value: '{"includeGitInstructions": true}' }) as never);
		on("fs.write", () => ({ value: undefined }) as never);
		on("store.get", () => ({ value: undefined }) as never);
		on("store.set", () => ({ value: undefined }) as never);

		// Act
		await $.session.start({ cwd: "/home/u/p", surface: null, isInteractive: true } as never);

		// Assert
		expect(logged).toContain(GIT_CONFLICT);
	});

	test("session start reports the conflict when a higher settings source turns the builtin block on during the fill", async ($, on) => {
		// Arrange: the user file lacks the switch, so the fill writes false there, while the merged settings read true.
		const logged = engine(on, { includeGitInstructions: true }, { HOME: "/home/u" });
		on("session.start", (_$, e) => e as never);
		on("fs.exists", () => ({ value: true }) as never);
		on("fs.read", () => ({ value: "{}" }) as never);
		on("fs.write", () => ({ value: undefined }) as never);
		on("store.get", () => ({ value: undefined }) as never);
		on("store.set", () => ({ value: undefined }) as never);

		// Act
		await $.session.start({ cwd: "/home/u/p", surface: null, isInteractive: true } as never);

		// Assert
		expect(logged).toContain(GIT_CONFLICT);
	});

	test("session start stays quiet when the switch is unset", async ($, on) => {
		// Arrange
		const logged = engine(on, {}, { HOME: "/home/u" });
		on("session.start", (_$, e) => e as never);
		on("fs.exists", () => ({ value: true }) as never);
		on("fs.read", () => ({ value: "{}" }) as never);
		on("fs.write", () => ({ value: undefined }) as never);
		on("store.get", () => ({ value: undefined }) as never);
		on("store.set", () => ({ value: undefined }) as never);

		// Act
		await $.session.start({ cwd: "/home/u/p", surface: null, isInteractive: true } as never);

		// Assert
		expect(logged).not.toContain(GIT_CONFLICT);
	});
});

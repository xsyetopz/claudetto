import type { On } from "claude-code";
import { describe, expect, test } from "claude-code/testing";

import { HELD, holdsSecret } from "../prompt";

const PASTE =
	"Count the users on db.internal, user app, password Hk7#qL9vZ2pW.";

/** A mask that finds nothing, so only the shapes and the prose rule decide. */
const none = (t: string): string => t;

const RUN = {
	exitCode: 127,
	stdout: "",
	stderr: "",
	isStdoutTruncated: false,
	isStderrTruncated: false
};

/** The engine beneath the hook: no env files, no scanner, and a record of what entered and what was put back. */
const engine = (on: On) => {
	const entered: string[] = [];
	const filled: string[] = [];
	on("session.root", () => ({ value: "/repo" }));
	on("fs.exists", () => ({ value: false }));
	on("process.run", () => ({ value: RUN }));
	on("ui.log", () => ({ value: undefined }));
	on("prompt.submit", (_$, e) => {
		entered.push(e.text);
		return { text: e.text };
	});
	on("prompt.fill", (_$, e) => {
		filled.push(e.text);
		return { isFilled: true };
	});
	return { entered, filled };
};

describe("prompt secrets", () => {
	test("finds a secret pasted in prose or as a key, and not a word that only names one", () => {
		// Act
		const found = [
			PASTE,
			"the aws key is AKIAZ7QW3RTY5UOP2XKM",
			"api key: 9f8e7d6c5b4a3210",
			"the token is ab12cd34ef56"
		].map((text) => holdsSecret(text, none));
		const missed = [
			"fix the token parser in lexer.ts",
			"the secret is in config.yaml",
			"reset the password field on the login form",
			"bump the api key rotation to 90 days"
		].map((text) => holdsSecret(text, none));

		// Assert
		expect(found).toEqual([true, true, true, true]);
		expect(missed).toEqual([false, false, false, false]);
	});

	test("a typed prompt with a secret is held back, and the box is left to the engine", async ($, on) => {
		// Arrange
		const { entered, filled } = engine(on);

		// Act
		const result = await $.prompt.submit({
			text: PASTE,
			origin: { kind: "composer" },
			wait: false
		});

		// Assert
		expect(result).toEqual({ drop: HELD });
		expect(entered).toEqual([]);
		expect(filled).toEqual([]);
	});

	test("the same text submitted again goes through", async ($, on) => {
		// Arrange
		const { entered } = engine(on);
		const typed = {
			text: PASTE,
			origin: { kind: "composer" },
			wait: false
		} as const;
		await $.prompt.submit(typed);

		// Act
		await $.prompt.submit(typed);

		// Assert
		expect(entered).toEqual([PASTE]);
	});

	test("a slash command with a secret in its arguments is held back", async ($, on) => {
		// Arrange
		const { entered } = engine(on);

		// Act
		const result = await $.prompt.submit({
			text: "/count db.internal user app password Hk7qL9vZ2pW",
			command: {
				name: "count",
				args: "db.internal user app password Hk7qL9vZ2pW"
			},
			origin: { kind: "composer" },
			wait: false
		});

		// Assert
		expect(result).toEqual({ drop: HELD });
		expect(entered).toEqual([]);
	});

	test("an ordinary prompt and a peer's message with a secret go through", async ($, on) => {
		// Arrange
		const { entered } = engine(on);

		// Act
		await $.prompt.submit({
			text: "rename fname to first_name in schema.sql",
			origin: { kind: "composer" },
			wait: false
		});
		await $.prompt.submit({
			text: PASTE,
			origin: { kind: "peer" },
			wait: false
		});

		// Assert
		expect(entered).toEqual([
			"rename fname to first_name in schema.sql",
			PASTE
		]);
	});
});

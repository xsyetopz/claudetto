import { describe, expect, test } from "claude-code/testing";

import { statusLineCommand, wireStatusLine } from "../status-line";

const ROOT = "/plugins/claudetto";
const WANT = `bun --no-env-file "${ROOT}/bin/claudetto-statusline"`;

describe("status line wiring", () => {
	test("sets the command when the user has no status line and keeps every other key", () => {
		// Act
		const next: unknown = JSON.parse(wireStatusLine('{"theme":"dark"}', ROOT));

		// Assert
		expect(next).toEqual({
			theme: "dark",
			statusLine: { type: "command", command: WANT }
		});
	});

	test("moves claudetto's own command to the new root and keeps its padding", () => {
		// Arrange
		const old = {
			statusLine: {
				type: "command",
				command: 'bun --no-env-file "/old/bin/claudetto-statusline"',
				padding: 2
			}
		};

		// Act
		const next: unknown = JSON.parse(wireStatusLine(JSON.stringify(old), ROOT));

		// Assert
		expect(next).toEqual({
			statusLine: { type: "command", command: WANT, padding: 2 }
		});
	});

	test("never overwrites a status line the user wrote", () => {
		// Arrange
		const text = '{"statusLine":{"type":"command","command":"my-line"}}';

		// Act and Assert
		expect(wireStatusLine(text, ROOT)).toBe(text);
	});

	test("leaves the text as it is when the command already names this root", () => {
		// Arrange
		const text = JSON.stringify({
			statusLine: { type: "command", command: statusLineCommand(ROOT) }
		});

		// Act and Assert
		expect(wireStatusLine(text, ROOT)).toBe(text);
	});

	test("leaves text that is not a JSON object alone", () => {
		// Act and Assert
		expect(wireStatusLine("[1]", ROOT)).toBe("[1]");
	});
});

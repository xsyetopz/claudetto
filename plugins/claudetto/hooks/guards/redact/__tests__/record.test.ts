import type { On, ToolCallResult } from "claude-code";
import { describe, expect, test } from "claude-code/testing";

const SECRET = "abc123xyz789";
const MASK = "[REDACTED]";

/** A project whose `.env` holds SECRET, no scanner, and a Bash tool that answers with whatever the test sets. */
const world = (on: On) => {
	const answer: { current: ToolCallResult } = {
		current: { result: "ok" }
	};
	on("session.root", () => ({ value: "/repo" }));
	on("fs.exists", (_$, e) => ({ value: e.path === "/repo" }));
	on("fs.list", () => ({
		value: [{ name: ".env", kind: "file", size: 1, mtimeMs: 0, isLink: false }]
	}));
	on("fs.read", () => ({ value: `API_TOKEN=${SECRET}\n` }));
	on("process.run", () => ({
		value: {
			exitCode: 0,
			stdout: "[]",
			stderr: "",
			isStdoutTruncated: false,
			isStderrTruncated: false
		}
	}));
	on("tool.check", () => ({ decision: "allow" }));
	on("tool.call", { tool: "Bash" }, () => answer.current);
	return answer;
};

describe("tool record masking", () => {
	test("every string in a nested record is masked while its keys and other types stay", async ($, on) => {
		// Arrange
		const answer = world(on);
		answer.current = {
			result: {
				stdout: `T=${SECRET}`,
				stderr: "",
				interrupted: false,
				file: { content: `x ${SECRET}`, numLines: 2 },
				lines: [SECRET, 3]
			}
		};

		// Act
		const out = await $.tool.call({ tool: "Bash", command: "cat .env" });

		// Assert
		expect(out).toEqual({
			result: {
				stdout: `T=${MASK}`,
				stderr: "",
				interrupted: false,
				file: { content: `x ${MASK}`, numLines: 2 },
				lines: [MASK, 3]
			}
		});
	});

	test("base64 image data is left alone", async ($, on) => {
		// Arrange
		const answer = world(on);
		const image = {
			type: "image",
			file: { base64: SECRET, type: "image/png" }
		};
		answer.current = { result: image };

		// Act
		const out = await $.tool.call({ tool: "Bash", command: "cat a.png" });

		// Assert
		expect(JSON.stringify(out)).toContain(SECRET);
	});

	test("an answer with a secret loses it and keeps the context the other hooks added", async ($, on) => {
		// Arrange
		const answer = world(on);
		answer.current = {
			ref: 4,
			result: { stdout: SECRET },
			text: SECRET,
			context: ["note"]
		};

		// Act
		const out = await $.tool.call({ tool: "Bash", command: "cat .env" });

		// Assert
		expect(JSON.stringify(out)).not.toContain(SECRET);
		expect(out.context).toContain("note");
	});

	test("an answer with nothing to mask is returned as it was", async ($, on) => {
		// Arrange
		const answer = world(on);
		answer.current = {
			ref: 4,
			result: { stdout: "3 passed" },
			text: "3 passed"
		};

		// Act
		const out = await $.tool.call({ tool: "Bash", command: "echo 3 passed" });

		// Assert
		expect(out.result).toEqual({ stdout: "3 passed" });
		expect(out.deny).toBeUndefined();
		expect(out.isError).toBeUndefined();
	});

	test("an error with a secret reaches the model masked", async ($, on) => {
		// Arrange
		const answer = world(on);
		answer.current = {
			isError: true,
			ref: 5,
			result: `Error: Exit code 3\n${SECRET}`,
			text: `Exit code 3\n${SECRET}`
		};

		// Act
		const out = await $.tool
			.call({ tool: "Bash", command: "cat .env; exit 3" })
			.catch((error: unknown) => error);

		// Assert
		expect(JSON.stringify(out)).not.toContain(SECRET);
		expect(JSON.stringify(out)).toContain("Exit code 3");
	});

	test("a clean error stays an error", async ($, on) => {
		// Arrange
		const answer = world(on);
		answer.current = {
			isError: true,
			ref: 6,
			result: "Error: Exit code 1",
			text: "Exit code 1"
		};

		// Act
		const out = await $.tool.call({ tool: "Bash", command: "false" });

		// Assert
		expect(out.isError).toBe(true);
		expect(out.text).toBe("Exit code 1");
	});

	test("a record with no text of its own is scanned as the record", async ($, on) => {
		// Arrange
		const answer = world(on);
		answer.current = { result: { stdout: SECRET } };

		// Act
		const out = await $.tool.call({ tool: "Bash", command: "cat .env" });

		// Assert
		expect(JSON.stringify(out)).not.toContain(SECRET);
	});
});

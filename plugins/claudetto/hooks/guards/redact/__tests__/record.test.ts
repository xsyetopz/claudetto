import { describe, expect, test } from "claude-code/testing";

import { answerText, maskAnswer, maskRecord } from "../record";

const mask = (t: string): string => t.split("abc123xyz789").join("[REDACTED]");

describe("tool record masking", () => {
	test("masks every string in a nested record and keeps its keys and other types", () => {
		// Arrange
		const record = { stdout: "T=abc123xyz789", stderr: "", interrupted: false, file: { content: "x abc123xyz789", numLines: 2 }, lines: ["abc123xyz789", 3] };

		// Act
		const out = maskRecord(record, mask);

		// Assert
		expect(out).toEqual({ stdout: "T=[REDACTED]", stderr: "", interrupted: false, file: { content: "x [REDACTED]", numLines: 2 }, lines: ["[REDACTED]", 3] });
	});

	test("returns the same record when nothing changed and leaves base64 data alone", () => {
		// Arrange
		const clean = { stdout: "3 passed", file: { numLines: 1 } };
		const image = { type: "image", file: { base64: "abc123xyz789", type: "image/png" } };

		// Act
		const sameClean = maskRecord(clean, mask);
		const sameImage = maskRecord(image, mask);

		// Assert
		expect(sameClean).toBe(clean);
		expect(sameImage).toBe(image);
	});

	test("an answer with a secret comes back as the hook's own result with its context", () => {
		// Arrange
		const answer = { ref: 4, result: { stdout: "abc123xyz789" }, text: "abc123xyz789", context: ["note"] } as never;

		// Act
		const out = maskAnswer(answer, mask);

		// Assert
		expect(out).toEqual({ result: { stdout: "[REDACTED]" }, context: ["note"] } as never);
	});

	test("an answer with nothing to mask comes back as the same object, ref and flags kept", () => {
		// Arrange
		const answer = { ref: 4, result: { stdout: "3 passed" }, text: "3 passed", isReadOnly: true } as never;

		// Act
		const out = maskAnswer(answer, mask);

		// Assert
		expect(out).toBe(answer);
	});

	test("an error with a secret becomes a deny with the masked text; a clean error and a deny stay", () => {
		// Arrange
		const error = { isError: true, ref: 5, result: "Error: Exit code 3\nabc123xyz789", text: "Exit code 3\nabc123xyz789" } as never;
		const cleanError = { isError: true, ref: 6, result: "Error: Exit code 1", text: "Exit code 1" } as never;
		const deny = { deny: "abc123xyz789" } as never;

		// Act
		const masked = maskAnswer(error, mask);

		// Assert
		expect(masked).toEqual({ deny: "Exit code 3\n[REDACTED]" } as never);
		expect(maskAnswer(cleanError, mask)).toBe(cleanError);
		expect(maskAnswer(deny, mask)).toBe(deny);
	});

	test("the scanned text is core's text, else the record, and nothing for a deny", () => {
		// Act
		const fromText = answerText({ result: { stdout: "a" }, text: "b" } as never);
		const fromRecord = answerText({ result: { stdout: "a" } } as never);
		const fromDeny = answerText({ deny: "no" } as never);

		// Assert
		expect(fromText).toBe("b");
		expect(fromRecord).toBe('{"stdout":"a"}');
		expect(fromDeny).toBe("");
	});
});

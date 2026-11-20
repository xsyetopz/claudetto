import { describe, expect, test } from "claude-code/testing";

import { envValues, isEnvFile } from "../env";
import { redact } from "../redact";

const ENV =
	'API_TOKEN=abc123xyz789\nexport DB_URL="postgres://u:pw4567@db/x"\nDEBUG=1\nNAME=dev # short\n# COMMENTED=notavalue99\n';

/** One timed batch of 1,000 redactions; the fastest of three samples keeps a stall on a loaded machine from failing the budget. */
const timed = (text: string, values: string[]): number => {
	const start = performance.now();
	for (let i = 0; i < 1000; i++) {
		redact(text, values, true);
	}
	return performance.now() - start;
};

describe("env-file secrets", () => {
	test("finds env-style files by name and leaves templates readable", () => {
		// Act
		const hits = [
			".env",
			".env.local",
			".env.prod",
			"prod.env",
			".envrc",
			"secrets.json",
			".secrets"
		].filter((name) => isEnvFile(name));
		const misses = [
			".env.example",
			"prod.env.sample",
			".env.template",
			".env.dist",
			"environment.ts",
			"env.py",
			"README.md"
		].filter((name) => isEnvFile(name));

		// Assert
		expect(hits.length).toBe(7);
		expect(misses.length).toBe(0);
	});

	test("reads quoted, exported and bare values and skips short ones and comments", () => {
		// Act
		const values = envValues(ENV);

		// Assert
		expect(values).toContain("abc123xyz789");
		expect(values).toContain("postgres://u:pw4567@db/x");
		expect(values).not.toContain("1");
		expect(values).not.toContain("dev");
		expect(values).not.toContain("notavalue99");
	});

	test("masks an env value wherever it appears, not only after its key", () => {
		// Act
		const out = redact(
			"API_TOKEN=abc123xyz789\ncurl -H x-token:abc123xyz789\nPLAIN=hello",
			envValues(ENV),
			false
		);

		// Assert
		expect(out).not.toContain("abc123xyz789");
		expect(out).toContain("PLAIN=hello");
	});

	test("masks 1,000 results of 10 KB in under 500 ms", () => {
		// Arrange
		const values = envValues(ENV);
		const text = "line of ordinary output\n".repeat(420);
		for (let i = 0; i < 50; i++) {
			redact(text, values, true);
		}
		const sample = (): number => timed(text, values);

		// Act
		const fastest = Math.min(sample(), sample(), sample());

		// Assert
		expect(fastest).toBeLessThan(500);
	});
});

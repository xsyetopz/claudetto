import { describe, expect, mock, test } from "claude-code/testing";

import { MASK, envValues, findings, isEnvFile, mapBlock, redact } from "../redact";

const ENV = 'API_TOKEN=abc123xyz789\nexport DB_URL="postgres://u:pw4567@db/x"\nDEBUG=1\nNAME=dev # short\n# COMMENTED=notavalue99\n';
const RUN = { exitCode: 0, stderr: "", isStdoutTruncated: false, isStderrTruncated: false };

describe("tool-result redaction", () => {
	test("finds env-style files by name and leaves templates readable", () => {
		// Act
		const hits = [".env", ".env.local", ".env.prod", "prod.env", ".envrc", "secrets.json", ".secrets"].filter(isEnvFile);
		const misses = [".env.example", "prod.env.sample", ".env.template", ".env.dist", "environment.ts", "env.py", "README.md"].filter(isEnvFile);

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
		const out = redact("API_TOKEN=abc123xyz789\ncurl -H x-token:abc123xyz789\nPLAIN=hello", envValues(ENV), false);

		// Assert
		expect(out).not.toContain("abc123xyz789");
		expect(out).toContain("PLAIN=hello");
	});

	test("the fallback shapes mask known key forms and leave ordinary output alone", () => {
		// Act
		const out = redact("STRIPE_SECRET_KEY=sk_live_abcdefghijklmnop1234\nAuthorization: Bearer eyJhbGciOi.abc\nghp_abcdefghijklmnopqrstuvwxyz0123\n3 passed in 0.01s", [], true);

		// Assert
		expect(out).not.toContain("sk_live_abcdefghijklmnop1234");
		expect(out).not.toContain("eyJhbGciOi.abc");
		expect(out).not.toContain("ghp_abcdefghijklmnopqrstuvwxyz0123");
		expect(out).toContain("3 passed in 0.01s");
		expect(redact("monkey=banana keyboard layout", [], true)).toBe("monkey=banana keyboard layout");
	});

	test("reads each secret of a betterleaks JSON report", () => {
		// Act
		const secrets = findings('[{"RuleID":"generic-api-key","Secret":"k3y-value-1","StartLine":1},{"RuleID":"x"}]');

		// Assert
		expect(secrets).toEqual(["k3y-value-1"]);
		expect(findings("")).toEqual([]);
	});

	test("rewrites string and text-array tool results and leaves other blocks as they are", () => {
		// Arrange
		const mask = (t: string): string => redact(t, ["abc123xyz789"], false);

		// Act
		const plain = mapBlock({ type: "tool_result", content: "T=abc123xyz789" }, mask);
		const parts = mapBlock({ type: "tool_result", content: [{ type: "text", text: "abc123xyz789" }, { type: "image" }] }, mask);
		const other = mapBlock({ type: "text", text: "abc123xyz789" }, mask);

		// Assert
		expect(plain.content).toBe(`T=${MASK}`);
		expect(parts.content).toEqual([{ type: "text", text: MASK }, { type: "image" }]);
		expect(other.text).toBe("abc123xyz789");
	});

	test("a tool result reaches the session with env values and scanner findings masked", async ($, on) => {
		// Arrange: a project with one .env file, and a scanner that reports a key the file does not hold.
		const session = mock.session(on);
		on("session.root", () => ({ value: "/repo" }));
		on("fs.exists", (_$, e) => ({ value: e.path === "/repo" }));
		on("fs.list", () => ({ value: [{ name: ".env", kind: "file", size: ENV.length, mtimeMs: 0 }, { name: ".env.example", kind: "file", size: 1, mtimeMs: 0 }] as never }));
		on("fs.read", (_$, e) => ({ value: e.path === "/repo/.env" ? ENV : "API_TOKEN=placeholder" }) as never);
		on("process.run", (_$, e) => ({ value: { ...RUN, stdout: e.argv[0] === "betterleaks" ? '[{"Secret":"AKIAZZZZZZZZZZZZZZZZ"}]' : "" } }));

		// Act
		await $.session.append({
			door: "tool-result",
			uuid: "u1",
			origin: { kind: "tool", tool: "Bash" },
			message: { type: "user", role: "user", content: [{ type: "tool_result", tool_use_id: "t1", content: "API_TOKEN=abc123xyz789\nkey AKIAZZZZZZZZZZZZZZZZ\n3 passed" }] },
		});

		// Assert
		const stored = JSON.stringify(session.appended());
		expect(stored).not.toContain("abc123xyz789");
		expect(stored).not.toContain("AKIAZZZZZZZZZZZZZZZZ");
		expect(stored).toContain("3 passed");
	});

	test("without betterleaks the fallback shapes still mask a tool result", async ($, on) => {
		// Arrange: no env files, and the scanner is missing.
		const session = mock.session(on);
		on("session.root", () => ({ value: "/repo" }));
		on("fs.exists", () => ({ value: false }));
		on("process.run", () => ({ value: { ...RUN, exitCode: 127, stdout: "" } }));

		// Act
		await $.session.append({
			door: "tool-result",
			uuid: "u2",
			origin: { kind: "tool", tool: "Bash" },
			message: { type: "user", role: "user", content: [{ type: "tool_result", tool_use_id: "t2", content: "GITHUB_TOKEN=ghp_abcdefghijklmnopqrstuvwxyz0123" }] },
		});

		// Assert
		expect(JSON.stringify(session.appended())).not.toContain("ghp_abcdefghijklmnopqrstuvwxyz0123");
	});

	test("masks 1,000 results of 10 KB in under 500 ms", () => {
		// Arrange
		const values = envValues(ENV);
		const text = "line of ordinary output\n".repeat(420);
		for (let i = 0; i < 50; i++) redact(text, values, true);
		// The fastest of three samples, so one stall on a loaded machine does not fail the budget.
		const sample = (): number => {
			const start = performance.now();
			for (let i = 0; i < 1000; i++) redact(text, values, true);
			return performance.now() - start;
		};

		// Act
		const fastest = Math.min(sample(), sample(), sample());

		// Assert
		expect(fastest).toBeLessThan(500);
	});
});

import { describe, expect, mock, test } from "claude-code/testing";

import { fieldOf } from "../../../shared/field";
import { findings, mapBlock, MASK, redact } from "../redact";

const ENV =
	'API_TOKEN=abc123xyz789\nexport DB_URL="postgres://u:pw4567@db/x"\nDEBUG=1\nNAME=dev # short\n# COMMENTED=notavalue99\n';
const RUN = {
	exitCode: 0,
	stderr: "",
	isStdoutTruncated: false,
	isStderrTruncated: false
};

const mask = (t: string): string => redact(t, ["abc123xyz789"], false);

describe("tool-result redaction", () => {
	test("the fallback shapes mask known key forms and leave ordinary output alone", () => {
		// Act
		const out = redact(
			"STRIPE_SECRET_KEY=sk_live_abcdefghijklmnop1234\nAuthorization: Bearer eyJhbGciOi.abc\nghp_abcdefghijklmnopqrstuvwxyz0123\n3 passed in 0.01s",
			[],
			true
		);

		// Assert
		expect(out).not.toContain("sk_live_abcdefghijklmnop1234");
		expect(out).not.toContain("eyJhbGciOi.abc");
		expect(out).not.toContain("ghp_abcdefghijklmnopqrstuvwxyz0123");
		expect(out).toContain("3 passed in 0.01s");
		expect(redact("monkey=banana keyboard layout", [], true)).toBe(
			"monkey=banana keyboard layout"
		);
	});

	test("reads each secret of a betterleaks JSON report", () => {
		// Act
		const secrets = findings(
			'[{"RuleID":"generic-api-key","Secret":"k3y-value-1","StartLine":1},{"RuleID":"x"}]'
		);

		// Assert
		expect(secrets).toEqual(["k3y-value-1"]);
		expect(findings("")).toEqual([]);
	});

	test("rewrites string and text-array tool results and leaves other blocks as they are", () => {
		// Act
		const plain = mapBlock(
			{ type: "tool_result", content: "T=abc123xyz789" },
			mask
		);
		const parts = mapBlock(
			{
				type: "tool_result",
				content: [{ type: "text", text: "abc123xyz789" }, { type: "image" }]
			},
			mask
		);
		const other = mapBlock({ type: "text", text: "abc123xyz789" }, mask);

		// Assert
		expect(fieldOf(plain, "content")).toBe(`T=${MASK}`);
		expect(fieldOf(parts, "content")).toEqual([
			{ type: "text", text: MASK },
			{ type: "image" }
		]);
		expect(fieldOf(other, "text")).toBe("abc123xyz789");
	});

	test("a tool result reaches the session with env values and scanner findings masked", async ($, on) => {
		// Arrange: a project with one .env file, and a scanner that reports a key the file does not hold.
		const session = mock.session(on);
		on("session.root", () => ({ value: "/repo" }));
		on("fs.exists", (_$, e) => ({ value: e.path === "/repo" }));
		on("fs.list", () => ({
			value: [
				{
					name: ".env",
					kind: "file",
					size: ENV.length,
					mtimeMs: 0,
					isLink: false
				},
				{
					name: ".env.example",
					kind: "file",
					size: 1,
					mtimeMs: 0,
					isLink: false
				}
			]
		}));
		on("fs.read", (_$, e) => ({
			value: e.path === "/repo/.env" ? ENV : "API_TOKEN=placeholder"
		}));
		on("process.run", (_$, e) => ({
			value: {
				...RUN,
				stdout:
					e.argv[0] === "betterleaks"
						? '[{"Secret":"AKIAZZZZZZZZZZZZZZZZ"}]'
						: ""
			}
		}));

		// Act
		await $.session.append({
			door: "tool-result",
			uuid: "u1",
			origin: { kind: "tool", tool: "Bash" },
			message: {
				type: "user",
				role: "user",
				content: [
					{
						type: "tool_result",
						tool_use_id: "t1",
						content:
							"API_TOKEN=abc123xyz789\nkey AKIAZZZZZZZZZZZZZZZZ\n3 passed"
					}
				]
			}
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
			message: {
				type: "user",
				role: "user",
				content: [
					{
						type: "tool_result",
						tool_use_id: "t2",
						content: "GITHUB_TOKEN=ghp_abcdefghijklmnopqrstuvwxyz0123"
					}
				]
			}
		});

		// Assert
		expect(JSON.stringify(session.appended())).not.toContain(
			"ghp_abcdefghijklmnopqrstuvwxyz0123"
		);
	});

	test("a scanner that throws leaves a debug line and the fallback shapes still mask", async ($, on) => {
		// Arrange
		const session = mock.session(on);
		on("session.root", () => ({ value: "/repo" }));
		on("fs.exists", () => ({ value: false }));
		on("process.run", () => {
			throw new Error("spawn ENOENT");
		});
		const lines: string[] = [];
		on("ui.log", (_$, e) => {
			lines.push(`${e.to}: ${e.text}`);
			return { value: undefined };
		});

		// Act
		await $.session.append({
			door: "tool-result",
			uuid: "u3",
			origin: { kind: "tool", tool: "Bash" },
			message: {
				type: "user",
				role: "user",
				content: [
					{
						type: "tool_result",
						tool_use_id: "t3",
						content: "GITHUB_TOKEN=ghp_abcdefghijklmnopqrstuvwxyz0123"
					}
				]
			}
		});

		// Assert
		expect(lines.length).toBe(1);
		expect(lines[0]).toStartWith("debug: claudetto redact scan failed:");
		expect(JSON.stringify(session.appended())).not.toContain(
			"ghp_abcdefghijklmnopqrstuvwxyz0123"
		);
	});

	test("a tool call's record comes back masked, so the transcript stores the masked value", async ($, on) => {
		// Arrange: a project with one .env file; core answers `cat .env` with the raw record.
		on("session.root", () => ({ value: "/repo" }));
		on("fs.exists", (_$, e) => ({ value: e.path === "/repo" }));
		on("fs.list", () => ({
			value: [
				{
					name: ".env",
					kind: "file",
					size: ENV.length,
					mtimeMs: 0,
					isLink: false
				}
			]
		}));
		on("fs.read", () => ({ value: ENV }));
		on("process.run", () => ({ value: { ...RUN, stdout: "[]" } }));
		on("tool.check", () => ({ decision: "allow" }));
		on("tool.call", { tool: "Bash" }, () => ({
			ref: 1,
			result: { stdout: "API_TOKEN=abc123xyz789", stderr: "" },
			text: "API_TOKEN=abc123xyz789"
		}));

		// Act
		const answer = await $.tool.call({ tool: "Bash", command: "cat .env" });

		// Assert
		expect(answer).toEqual({
			result: { stdout: `API_TOKEN=${MASK}`, stderr: "" }
		});
	});

	test("a row whose call was masked at the tool call is not scanned a second time", async ($, on) => {
		// Arrange
		const session = mock.session(on);
		on("session.root", () => ({ value: "/repo" }));
		on("fs.exists", () => ({ value: false }));
		const scans: string[] = [];
		on("process.run", (_$, e) => {
			if (e.argv[0] === "betterleaks") {
				scans.push(e.init?.stdin ?? "");
			}
			return { value: { ...RUN, stdout: "[]" } };
		});
		on("tool.check", () => ({ decision: "allow" }));
		on("tool.call", { tool: "Bash" }, () => ({
			ref: 1,
			result: { stdout: "ok" },
			text: "ok"
		}));

		// Act
		await $.tool.call({ tool: "Bash", command: "true", tool_use_id: "t9" });
		await $.session.append({
			door: "tool-result",
			uuid: "u9",
			origin: { kind: "tool", tool: "Bash" },
			message: {
				type: "user",
				role: "user",
				content: [{ type: "tool_result", tool_use_id: "t9", content: "ok" }]
			}
		});

		// Assert
		expect(scans).toEqual(["ok"]);
		expect(JSON.stringify(session.appended())).toContain("ok");
	});
});

import type { On } from "claude-code";
import { describe, expect, mock, test } from "claude-code/testing";

const MASK = "[REDACTED]";
const ENV =
	'API_TOKEN=abc123xyz789\nexport DB_URL="postgres://u:pw4567@db/x"\nDEBUG=1\nNAME=dev # short\n# COMMENTED=notavalue99\n';
const RUN = {
	exitCode: 0,
	stderr: "",
	isStdoutTruncated: false,
	isStderrTruncated: false
};

const entry = (name: string) => ({
	name,
	kind: "file" as const,
	size: 1,
	mtimeMs: 0,
	isLink: false
});

/** A project whose root holds the given env-style files; the scanner reports `found` as JSON. */
const project = (
	on: On,
	files: Record<string, string>,
	found: string[] = []
) => {
	on("session.root", () => ({ value: "/repo" }));
	on("fs.exists", (_$, e) => ({ value: e.path === "/repo" }));
	on("fs.list", () => ({
		value: Object.keys(files).map((name) => entry(name))
	}));
	on("fs.read", (_$, e) => ({
		value: files[e.path.replace("/repo/", "")] ?? ""
	}));
	on("process.run", (_$, e) => ({
		value: {
			...RUN,
			stdout:
				e.argv[0] === "betterleaks"
					? JSON.stringify(found.map((Secret) => ({ Secret })))
					: ""
		}
	}));
};

/** A project with no env files and no scanner on the machine. */
const noScanner = (on: On) => {
	on("session.root", () => ({ value: "/repo" }));
	on("fs.exists", () => ({ value: false }));
	on("process.run", () => ({ value: { ...RUN, exitCode: 127, stdout: "" } }));
};

/** One tool-result row as the engine appends it to the session. */
const row = (uuid: string, content: unknown) => ({
	door: "tool-result" as const,
	uuid,
	origin: { kind: "tool" as const, tool: "Bash" },
	message: {
		type: "user" as const,
		role: "user" as const,
		content: [{ type: "tool_result" as const, tool_use_id: uuid, content }]
	}
});

describe("tool-result redaction", () => {
	test("a tool result reaches the session with env values and scanner findings masked", async ($, on) => {
		// Arrange: a project with one .env file and a template, and a scanner that reports a key the file does not hold.
		const session = mock.session(on);
		project(on, { ".env": ENV, ".env.example": "API_TOKEN=placeholder" }, [
			"AKIAZZZZZZZZZZZZZZZZ"
		]);

		// Act
		await $.session.append(
			row(
				"u1",
				"API_TOKEN=abc123xyz789\nkey AKIAZZZZZZZZZZZZZZZZ\nurl postgres://u:pw4567@db/x\nDEBUG=1\nNAME=dev\n# COMMENTED=notavalue99\nTEMPLATE=placeholder\n3 passed"
			)
		);

		// Assert
		const stored = JSON.stringify(session.appended());
		expect(stored).not.toContain("abc123xyz789");
		expect(stored).not.toContain("AKIAZZZZZZZZZZZZZZZZ");
		expect(stored).not.toContain("postgres://u:pw4567@db/x");
		expect(stored).toContain("3 passed");
		expect(stored).toContain("DEBUG=1");
		expect(stored).toContain("NAME=dev");
		expect(stored).toContain("notavalue99");
		expect(stored).toContain("TEMPLATE=placeholder");
	});

	test("without betterleaks the fallback shapes mask known key forms and leave ordinary output alone", async ($, on) => {
		// Arrange: no env files, and the scanner is missing.
		const session = mock.session(on);
		noScanner(on);

		// Act
		await $.session.append(
			row(
				"u2",
				"STRIPE_SECRET_KEY=sk_live_abcdefghijklmnop1234\nAuthorization: Bearer eyJhbGciOi.abc\nGITHUB_TOKEN=ghp_abcdefghijklmnopqrstuvwxyz0123\nmonkey=banana keyboard layout\n3 passed in 0.01s"
			)
		);

		// Assert
		const stored = JSON.stringify(session.appended());
		expect(stored).not.toContain("sk_live_abcdefghijklmnop1234");
		expect(stored).not.toContain("eyJhbGciOi.abc");
		expect(stored).not.toContain("ghp_abcdefghijklmnopqrstuvwxyz0123");
		expect(stored).toContain("monkey=banana keyboard layout");
		expect(stored).toContain("3 passed in 0.01s");
	});

	test("a result of text parts is masked part by part and its image part stays", async ($, on) => {
		// Arrange
		const session = mock.session(on);
		project(on, { ".env": ENV });

		// Act
		await $.session.append(
			row("u4", [{ type: "text", text: "abc123xyz789" }, { type: "image" }])
		);

		// Assert
		const stored = JSON.stringify(session.appended());
		expect(stored).not.toContain("abc123xyz789");
		expect(stored).toContain(MASK);
		expect(stored).toContain('"type":"image"');
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
		await $.session.append(
			row("u3", "GITHUB_TOKEN=ghp_abcdefghijklmnopqrstuvwxyz0123")
		);

		// Assert
		expect(lines.length).toBe(1);
		expect(lines[0]).toStartWith("debug:");
		expect(JSON.stringify(session.appended())).not.toContain(
			"ghp_abcdefghijklmnopqrstuvwxyz0123"
		);
	});

	test("a tool call's record comes back masked, so the transcript stores the masked value", async ($, on) => {
		// Arrange: a project with one .env file; core answers `cat .env` with the raw record.
		project(on, { ".env": ENV }, []);
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
		await $.session.append(row("t9", "ok"));

		// Assert
		expect(scans).toEqual(["ok"]);
		expect(JSON.stringify(session.appended())).toContain("ok");
	});
});

import { expect, test } from "claude-code/testing";

const out = (stdout: string) => ({
	value: {
		exitCode: 0,
		stdout,
		stderr: "",
		isStdoutTruncated: false,
		isStderrTruncated: false
	}
});

test("REQ-SPEC-001 the tool registers and serves a result", async ($, on) => {
	// Arrange
	const registered: string[] = [];
	on("session.start", (_$, e) => ({ cwd: e.cwd }));
	on("tool.register", (_$, e) => {
		registered.push(e.name);
		return { value: { tool: e.name } };
	});
	on("ui.log", () => ({ value: undefined }));
	on("process.run", (_$, e) =>
		out(e.argv[1] === "ls-files" ? "specs/a.md\nsrc/a.test.ts\n" : "")
	);
	on("fs.read", (_$, e) =>
		e.path === "specs/a.md"
			? { value: "# A\n\n## A-1 Thing\n\nIt works.\n" }
			: { value: "test('A-1', () => {})" }
	);

	// Act
	await $.session.start({ cwd: "/repo", surface: null, isInteractive: false });
	const { result } = await $.tool.call({
		tool: "mcp__claudetto-spec__spec_check",
		tool_use_id: "t1"
	});

	// Assert
	expect(registered.length).toBe(1);
	expect(result).toEqual(expect.stringContaining('"uncovered": []'));
});

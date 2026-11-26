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

test("SPEC-001 the tool registers and serves a result", async ($, on) => {
	// Arrange
	const registered: string[] = [];
	on("session.start", (_$, e) => ({ cwd: e.cwd }));
	on("tool.register", (_$, e) => {
		registered.push(e.name);
		return { value: { tool: e.name } };
	});
	on("ui.log", () => ({ value: undefined }));
	on("process.run", (_$, e) =>
		out(e.argv.includes("ls-files") ? "specs/a.md\nsrc/a.test.ts\n" : "")
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

test("SPEC-001 the tool's description fits the 200-character tool bound", async ($, on) => {
	// Arrange
	const descriptions: string[] = [];
	on("session.start", (_$, e) => ({ cwd: e.cwd }));
	on("tool.register", (_$, e) => {
		descriptions.push(e.description);
		return { value: { tool: e.name } };
	});

	// Act
	await $.session.start({ cwd: "/repo", surface: null, isInteractive: false });

	// Assert
	expect(descriptions.length).toBe(1);
	expect(descriptions[0]?.length).toBeLessThanOrEqual(200);
});

test("SPEC-012 git runs with quotePath off and reads HEAD and index texts", async ($, on) => {
	// Arrange
	const argvs: (readonly string[])[] = [];
	on("session.start", (_$, e) => ({ cwd: e.cwd }));
	on("tool.register", (_$, e) => ({ value: { tool: e.name } }));
	on("ui.log", () => ({ value: undefined }));
	on("process.run", (_$, e) => {
		argvs.push(e.argv);
		const edited =
			e.argv.includes("diff") && !e.argv.includes("--diff-filter=D");
		if (e.argv.includes("ls-files")) {
			return out("specs/a.md\ntests/café.test.ts\n");
		}
		return out(edited ? "tests/café.test.ts\n" : "");
	});
	on("fs.read", () => ({ value: "" }));

	// Act
	await $.session.start({ cwd: "/repo", surface: null, isInteractive: false });
	await $.tool.call({
		tool: "mcp__claudetto-spec__spec_check",
		tool_use_id: "t2"
	});

	// Assert
	expect(
		argvs.every(
			(a) => a.slice(0, 3).join(" ") === "git -c core.quotePath=false"
		)
	).toBe(true);
	expect(argvs.some((a) => a.includes("HEAD:specs/a.md"))).toBe(true);
	expect(argvs.some((a) => a.includes(":tests/café.test.ts"))).toBe(true);
});

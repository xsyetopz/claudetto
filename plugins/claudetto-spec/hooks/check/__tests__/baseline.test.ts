import type { On } from "claude-code";
import { expect, test } from "claude-code/testing";

const out = (stdout: string, exitCode = 0) => ({
	value: {
		exitCode,
		stdout,
		stderr: "",
		isStdoutTruncated: false,
		isStderrTruncated: false
	}
});

const SPEC = "specs/a.md";
const TEST = "src/a.test.ts";
const spec = (behaviour: string) => `# A\n\n## A-1 Thing\n\n${behaviour}\n`;

/** A repo whose work tree the test edits between session start and Stop. */
interface Repo {
	tree: Map<string, string>;
	head: Map<string, string>;
	index: Map<string, string>;
}

/** Injects git and the file system over `repo`; `git diff` lists the test when it differs from the index. */
function mount(on: On, repo: Repo): void {
	on("classic.Stop", () => ({}));
	on("session.start", (_$, e) => ({ cwd: e.cwd }));
	on("tool.register", (_$, e) => ({ value: { tool: e.name } }));
	on("ui.log", () => ({ value: undefined }));
	on("fs.exists", () => ({ value: true }));
	on("process.run", (_$, e) => {
		const argv = e.argv.join(" ");
		if (argv.includes("ls-files")) {
			return out([...repo.tree.keys()].join("\n"));
		}
		if (argv.includes("--diff-filter=D")) {
			return out("");
		}
		if (argv.includes(" diff ")) {
			const differs = repo.index.get(TEST) !== repo.tree.get(TEST);
			return out(differs ? `${TEST}\n` : "");
		}
		const ref = e.argv.at(-1) ?? "";
		const text = ref.startsWith("HEAD:")
			? repo.head.get(ref.slice(5))
			: repo.index.get(ref.slice(1));
		return text === undefined ? out("", 128) : out(text);
	});
	on("fs.read", (_$, e) => ({
		value: repo.tree.get(e.path.replace(/^.*?(specs|src)\//u, "$1/")) ?? ""
	}));
}

const start = { cwd: "/repo", surface: null, isInteractive: true };

test("RISK-519 a requirement the user reworded before the session is not the agent's drift", async ($, on) => {
	// Arrange
	const repo: Repo = {
		tree: new Map([
			[SPEC, spec("It fails.")],
			[TEST, "test('A-1', () => { expect(1).toBe(1); });"]
		]),
		head: new Map([[SPEC, spec("It works.")]]),
		index: new Map([[TEST, "test('A-1', () => { expect(1).toBe(1); });"]])
	};
	mount(on, repo);

	// Act
	await $.session.start(start);
	const result = await $.classic.Stop({ stop_hook_active: false });

	// Assert
	expect(result.block).toBeUndefined();
});

test("RISK-519 a requirement the agent rewords in the session is named with its start wording", async ($, on) => {
	// Arrange
	const repo: Repo = {
		tree: new Map([
			[SPEC, spec("It fails.")],
			[TEST, "test('A-1', () => { expect(1).toBe(1); });"]
		]),
		head: new Map([[SPEC, spec("It works.")]]),
		index: new Map([[TEST, "test('A-1', () => { expect(1).toBe(1); });"]])
	};
	mount(on, repo);
	await $.session.start(start);
	repo.tree.set(SPEC, spec("It sometimes fails."));

	// Act
	const result = await $.classic.Stop({ stop_hook_active: false });

	// Assert
	expect(result.block).toEqual(
		expect.stringContaining(
			'A-1 changed in this session; at session start it read "It fails."'
		)
	);
});

test("RISK-519 a todo the user's unstaged test already held is not the agent's tampering", async ($, on) => {
	// Arrange
	const repo: Repo = {
		tree: new Map([
			[SPEC, spec("It works.")],
			[
				TEST,
				"test('A-1', () => { expect(1).toBe(1); });\ntest.todo('A-1 later');"
			]
		]),
		head: new Map([[SPEC, spec("It works.")]]),
		index: new Map([[TEST, ""]])
	};
	mount(on, repo);

	// Act
	await $.session.start(start);
	const result = await $.classic.Stop({ stop_hook_active: false });

	// Assert
	expect(result.block).toBeUndefined();
});

test("RISK-519 a skip the agent adds in the session to that test is still reported", async ($, on) => {
	// Arrange
	const repo: Repo = {
		tree: new Map([
			[SPEC, spec("It works.")],
			[
				TEST,
				"test('A-1', () => { expect(1).toBe(1); });\ntest.todo('A-1 later');"
			]
		]),
		head: new Map([[SPEC, spec("It works.")]]),
		index: new Map([[TEST, ""]])
	};
	mount(on, repo);
	await $.session.start(start);
	repo.tree.set(
		TEST,
		"test.skip('A-1', () => { expect(1).toBe(1); });\ntest.todo('A-1 later');"
	);

	// Act
	const result = await $.classic.Stop({ stop_hook_active: false });

	// Assert
	expect(result.block).toEqual(expect.stringContaining(".skip("));
});

test("RISK-519 spec_check does not report the user's pre-session rewording as drift", async ($, on) => {
	// Arrange
	const repo: Repo = {
		tree: new Map([
			[SPEC, spec("It fails.")],
			[TEST, "test('A-1', () => { expect(1).toBe(1); });"]
		]),
		head: new Map([[SPEC, spec("It works.")]]),
		index: new Map([[TEST, "test('A-1', () => { expect(1).toBe(1); });"]])
	};
	mount(on, repo);
	await $.session.start(start);

	// Act
	const { result } = await $.tool.call({
		tool: "mcp__claudetto-spec__spec_check",
		tool_use_id: "t1"
	});

	// Assert
	expect(result).toEqual(expect.stringContaining('"reworded": []'));
});

test("RISK-519 spec_check reports a rewording the session made", async ($, on) => {
	// Arrange
	const repo: Repo = {
		tree: new Map([
			[SPEC, spec("It fails.")],
			[TEST, "test('A-1', () => { expect(1).toBe(1); });"]
		]),
		head: new Map([[SPEC, spec("It works.")]]),
		index: new Map([[TEST, "test('A-1', () => { expect(1).toBe(1); });"]])
	};
	mount(on, repo);
	await $.session.start(start);
	repo.tree.set(SPEC, spec("It sometimes fails."));

	// Act
	const { result } = await $.tool.call({
		tool: "mcp__claudetto-spec__spec_check",
		tool_use_id: "t1"
	});

	// Assert
	expect(result).toEqual(expect.stringContaining('"id": "A-1"'));
	expect(result).not.toEqual(expect.stringContaining('"reworded": []'));
});

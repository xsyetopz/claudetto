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

const SPEC_OK = "# A\n\n## A-1 Thing\n\nIt works.\n";
const TEST_ORPHAN = "test('A-1 A-9', () => { expect(1).toBe(1); });";
const TEST_CLEAN = "test('A-1', () => { expect(1).toBe(1); });";

interface Probe {
	runs: number;
	logs: string[];
}

/** Injects the engine: a repo with or without `specs/`, one test text, and a git that may fail. */
function repo(
	on: On,
	opts: {
		specs: boolean;
		test: string;
		gitFails?: boolean;
		head?: string;
		existsThrows?: boolean;
	}
): Probe {
	const probe: Probe = { runs: 0, logs: [] };
	on("classic.Stop", () => ({}));
	on("fs.exists", () => {
		if (opts.existsThrows === true) {
			throw new Error("boom");
		}
		return { value: opts.specs };
	});
	on("process.run", (_$, e) => {
		probe.runs += 1;
		if (opts.gitFails === true) {
			return out("", 128);
		}
		if (e.argv.includes("show")) {
			return opts.head === undefined ? out("", 128) : out(opts.head);
		}
		return out(
			e.argv.includes("ls-files") ? "specs/a.md\nsrc/a.test.ts\n" : ""
		);
	});
	on("fs.read", (_$, e) => ({
		value: e.path.endsWith("specs/a.md") ? SPEC_OK : opts.test
	}));
	on("ui.log", (_$, e) => {
		probe.logs.push(e.text);
		return { value: undefined };
	});
	return probe;
}

test("SPEC-016 a hard finding blocks the main agent's first Stop", async ($, on) => {
	// Arrange
	repo(on, { specs: true, test: TEST_ORPHAN });

	// Act
	const result = await $.classic.Stop({ stop_hook_active: false });

	// Assert
	expect(result.block).toEqual(expect.stringContaining("A-9"));
});

test("SPEC-016 a Stop that follows a block passes, so the gate cannot loop", async ($, on) => {
	// Arrange
	repo(on, { specs: true, test: TEST_ORPHAN });

	// Act
	const result = await $.classic.Stop({ stop_hook_active: true });

	// Assert
	expect(result.block).toBeUndefined();
});

test("SPEC-016 a subagent's Stop is never blocked", async ($, on) => {
	// Arrange
	repo(on, { specs: true, test: TEST_ORPHAN });

	// Act
	const result = await $.classic.Stop({
		stop_hook_active: false,
		agent_id: "sub-1"
	});

	// Assert
	expect(result.block).toBeUndefined();
});

test("SPEC-016 a repo without specs/ runs no git and does not block", async ($, on) => {
	// Arrange
	const probe = repo(on, { specs: false, test: TEST_ORPHAN });

	// Act
	const result = await $.classic.Stop({ stop_hook_active: false });

	// Assert
	expect(result.block).toBeUndefined();
	expect(probe.runs).toBe(0);
});

test("SPEC-016 advice findings alone do not block", async ($, on) => {
	// Arrange
	repo(on, { specs: true, test: "test('nothing', () => {});" });

	// Act
	const result = await $.classic.Stop({ stop_hook_active: false });

	// Assert
	expect(result.block).toBeUndefined();
});

test("SPEC-016 a clean repo does not block", async ($, on) => {
	// Arrange
	repo(on, { specs: true, test: TEST_CLEAN });

	// Act
	const result = await $.classic.Stop({ stop_hook_active: false });

	// Assert
	expect(result.block).toBeUndefined();
});

test("SPEC-016 a git failure fails open", async ($, on) => {
	// Arrange
	repo(on, { specs: true, test: TEST_ORPHAN, gitFails: true });

	// Act
	const result = await $.classic.Stop({ stop_hook_active: false });

	// Assert
	expect(result.block).toBeUndefined();
});

test("SPEC-016 a thrown error fails open and is logged", async ($, on) => {
	// Arrange
	const probe = repo(on, {
		specs: true,
		test: TEST_ORPHAN,
		existsThrows: true
	});

	// Act
	const result = await $.classic.Stop({ stop_hook_active: false });

	// Assert
	expect(result.block).toBeUndefined();
	expect(probe.logs.some((m) => m.includes("gate failed"))).toBe(true);
});

test("SPEC-016 a reworded requirement lets the Stop pass and shows the person its old wording once", async ($, on) => {
	// Arrange
	const probe = repo(on, {
		specs: true,
		test: TEST_CLEAN,
		head: "# A\n\n## A-1 Thing\n\nIt fails.\n"
	});

	// Act
	const first = await $.classic.Stop({ stop_hook_active: false });
	const second = await $.classic.Stop({ stop_hook_active: false });

	// Assert
	expect(first.block).toBeUndefined();
	expect(second.block).toBeUndefined();
	const shown = probe.logs.filter((m) => m.includes("`A-1`"));
	expect(shown).toHaveLength(1);
	expect(shown[0]).toEqual(expect.stringContaining('"It fails."'));
});

test("SPEC-016 a removed requirement is shown to the person with its old wording", async ($, on) => {
	// Arrange
	const probe = repo(on, {
		specs: true,
		test: TEST_CLEAN,
		head: "# A\n\n## A-1 Thing\n\nIt works.\n\n## A-2 Gone\n\nIt went.\n"
	});

	// Act
	const result = await $.classic.Stop({ stop_hook_active: false });

	// Assert
	expect(result.block).toBeUndefined();
	expect(probe.logs).toEqual([
		expect.stringMatching(/`A-2` removed[\s\S]*"It went\."/u)
	]);
});

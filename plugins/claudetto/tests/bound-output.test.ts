import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";
import { bareRepo } from "./gate/facts.ts";

interface Written {
	readonly path: string;
	readonly text: string;
}

const LONG = `START\n${"pass line\n".repeat(3000)}FAIL src/a.test.ts\n${"pass line\n".repeat(3000)}Tests: 1 failed\nEND`;

/** The tool answers `result` as the `Bash` tool does, and each file the hook writes is kept. */
const lab = (on: On, result: unknown, isError = false): Written[] => {
	const files: Written[] = [];
	bareRepo(on);
	on("env.get", () => ({ value: undefined }));
	on("session.cwd", () => ({ value: "/repo" }));
	on("tool.check", () => ({ decision: "allow" }));
	on("fs.write", (_$, e) => {
		files.push({ path: e.path, text: e.text });
		return { value: undefined };
	});
	on("tool.call", () =>
		isError ? { result, text: "ran", isError: true } : { result, text: "ran" },
	);
	return files;
};

const stdoutOf = (out: { readonly result?: unknown }): string => {
	const { result } = out;
	return typeof result === "object" &&
		result !== null &&
		"stdout" in result &&
		typeof result.stdout === "string"
		? result.stdout
		: "";
};

test("a long `bun test` output is cut to its head and tail with the failure line and one cut line", async ($: Engine, on: On) => {
	const files = lab(on, { stdout: LONG, stderr: "" });

	const out = await $.tool.call({ tool: "Bash", command: "bun test" });

	const stdout = stdoutOf(out);
	expect(stdout.length).toBeLessThan(9000);
	expect(stdout.startsWith("START")).toBe(true);
	expect(stdout.endsWith("END")).toBe(true);
	expect(stdout).toContain("FAIL src/a.test.ts");
	expect(stdout).toContain("the full output is in `.claude/claudetto/output/");
	expect(files).toHaveLength(1);
	expect(files[0]?.text).toContain("Tests: 1 failed");
	expect(files[0]?.text.length).toBeGreaterThan(LONG.length - 5);
});

test("an error result keeps its error form while its output is cut", async ($: Engine, on: On) => {
	lab(on, { stdout: LONG, stderr: "" }, true);

	const out = await $.tool.call({ tool: "Bash", command: "cargo test" });

	expect(out.isError).toBe(true);
	expect(stdoutOf(out).length).toBeLessThan(9000);
});

test("a command that is no test or build run keeps its whole output", async ($: Engine, on: On) => {
	const files = lab(on, { stdout: LONG, stderr: "" });

	const out = await $.tool.call({ tool: "Bash", command: "cat big.log" });

	expect(stdoutOf(out)).toBe(LONG);
	expect(files).toEqual([]);
});

test("output within the bound is left as it is", async ($: Engine, on: On) => {
	const files = lab(on, { stdout: "ok\n", stderr: "" });

	const out = await $.tool.call({ tool: "Bash", command: "bun test" });

	expect(stdoutOf(out)).toBe("ok\n");
	expect(files).toEqual([]);
});

test(
	"`maxTestOutputChars` of 0 turns the cut off",
	{ options: { maxTestOutputChars: 0 } },
	async ($: Engine, on: On) => {
		lab(on, { stdout: LONG, stderr: "" });

		const out = await $.tool.call({ tool: "Bash", command: "bun test" });

		expect(stdoutOf(out)).toBe(LONG);
	},
);

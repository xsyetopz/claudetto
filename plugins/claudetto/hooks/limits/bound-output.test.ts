import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

import { scanner } from "../secrets.mock.ts";

interface Written {
	readonly path: string;
	readonly text: string;
}

const LONG = `START\n${"pass line\n".repeat(3000)}Tests: 1 failed\nEND`;

const lab = (
	on: On,
	result: unknown,
	isError?: true,
	writeFails = false,
): Written[] => {
	scanner(on);
	const files: Written[] = [];
	on("clock.now", () => ({ value: 0 }));
	on("fs.exists", () => ({ value: false }));
	on("session.cwd", () => ({ value: "/repo" }));
	on("session.root", () => ({ value: "/repo" }));
	on("fs.write", (_$, e) => {
		if (writeFails) {
			throw new Error("disk full");
		}
		files.push({ path: e.path, text: e.text });
		return { value: undefined };
	});
	on("tool.call", () => ({
		result,
		text: "ran",
		...(isError ? { isError } : {}),
	}));
	return files;
};

const run = ($: Engine, command: string) =>
	$.tool.call({ tool: "Bash", tool_use_id: "toolu_1", command });

const stdoutOf = (out: { readonly result?: unknown }): string => {
	const { result } = out;
	return typeof result === "object" &&
		result !== null &&
		"stdout" in result &&
		typeof result.stdout === "string"
		? result.stdout
		: "";
};

test("a long test run is cut to its head and tail, and the whole text is saved", async ($: Engine, on: On) => {
	const files = lab(on, { stdout: LONG, stderr: "" });

	const out = await run($, "bun test");

	const text = stdoutOf(out);
	expect(text.length).toBeLessThan(8200);
	expect(text.startsWith("START")).toBe(true);
	expect(text.endsWith("END")).toBe(true);
	expect(text).toContain("the full output is in");
	expect(files).toHaveLength(1);
	expect(files[0]?.text.startsWith(LONG)).toBe(true);
});

test("a command that is no test, build, or lint run is left whole", async ($: Engine, on: On) => {
	const files = lab(on, { stdout: LONG, stderr: "" });

	const out = await run($, "echo bun test");

	expect(stdoutOf(out)).toBe(LONG);
	expect(files).toEqual([]);
});

test("an output that fits is left whole and saves nothing", async ($: Engine, on: On) => {
	const files = lab(on, { stdout: "ok", stderr: "" });

	const out = await run($, "bun test");

	expect(stdoutOf(out)).toBe("ok");
	expect(files).toEqual([]);
});

test(
	"maxTestOutputChars 0 leaves every output whole",
	{ options: { maxTestOutputChars: 0 } },
	async ($: Engine, on: On) => {
		lab(on, { stdout: LONG, stderr: "" });

		const out = await run($, "bun test");

		expect(stdoutOf(out)).toBe(LONG);
	},
);

test("an error result keeps its error form while its output is cut", async ($: Engine, on: On) => {
	lab(on, { stdout: LONG, stderr: "" }, true);

	const out = await run($, "bun test");

	expect(out.isError).toBe(true);
	expect(stdoutOf(out)).toContain("the full output is in");
});

for (const command of [
	"cargo test",
	"pytest -x",
	"go test ./...",
	"just check",
	"bun run build",
]) {
	test(`the output of \`${command}\` is cut`, async ($: Engine, on: On) => {
		lab(on, { stdout: LONG, stderr: "" });

		const out = await run($, command);

		expect(stdoutOf(out)).toContain("the full output is in");
	});
}

test("a failed run that arrives as a string is cut into the object shape the engine accepts", async ($: Engine, on: On) => {
	const files = lab(on, `Error: Exit code 1\n${LONG}`, true);

	const out = await run($, "bun test");

	expect(out.isError).toBe(true);
	expect(out.result).toMatchObject({ stderr: "", interrupted: false });
	expect(stdoutOf(out)).toContain("the full output is in");
	expect(stdoutOf(out).length).toBeLessThan(8200);
	expect(files).toHaveLength(1);
});

test("an output that cannot be saved is cut, and the cut line says so", async ($: Engine, on: On) => {
	lab(on, { stdout: LONG, stderr: "" }, undefined, true);

	const out = await run($, "bun test");

	expect(stdoutOf(out)).toContain("the full output could not be saved");
	expect(stdoutOf(out).length).toBeLessThan(8200);
});

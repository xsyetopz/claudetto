import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";
import { scanner } from "../secrets.mock.ts";
import { splitRead } from "./read-split.ts";

test("a line that closes with a cat of one file splits into the rest and the file", () => {
	expect(splitRead("bun test 2>&1 | head -40; cat src/lib.ts")).toEqual({
		rest: "bun test 2>&1 | head -40",
		file: "src/lib.ts",
	});
	expect(splitRead("bun test && cat src/lib.ts")).toEqual({
		rest: "bun test",
		file: "src/lib.ts",
	});
});

test("a line the split cannot make exact is left whole", () => {
	for (const line of [
		"cat src/lib.ts",
		"bun test; cat a.ts b.ts",
		"bun test; cat -n a.ts",
		"bun test; cat a.ts | head",
		"bun test; cat a.ts > b.ts",
		"bun test; cat ~/a.ts",
		"bun test; cat $F",
		"echo 'a; cat b.ts'",
		"bun test; cat a.ts; ls",
	]) {
		expect(splitRead(line)).toBeUndefined();
	}
});

const lab = (on: On, readFails = false): string[] => {
	scanner(on);
	const ran: string[] = [];
	on("clock.now", () => ({ value: 0 }));
	on("session.cwd", () => ({ value: "/repo" }));
	on("fs.exists", () => ({ value: false }));
	on("tool.check", () => ({ decision: "allow" }));
	on("tool.call", { tool: ["Read"] }, () =>
		readFails
			? { result: "no such file", text: "no such file", isError: true }
			: { result: "numbered", text: "1\tconst x = 1;" },
	);
	on("tool.call", { tool: ["Bash"] }, (_$, e) => {
		ran.push(String(e.command));
		return {
			result: { stdout: "ok", stderr: "", interrupted: false },
			text: "ok",
		};
	});
	return ran;
};

const run = ($: Engine, command: string) =>
	$.tool.call({ tool: "Bash", tool_use_id: "toolu_1", command });

test("the closing cat is read with Read in the same call and the rest runs alone", async ($: Engine, on: On) => {
	const ran = lab(on);

	const out = await run($, "bun test; cat src/lib.ts");

	expect(ran).toEqual(["bun test"]);
	expect(out.result).toMatchObject({
		stdout: expect.stringContaining("ok\n1\tconst x = 1;"),
	});
});

test("a read that fails after the rest ran ends the result with the error, as cat would", async ($: Engine, on: On) => {
	const ran = lab(on, true);

	const out = await run($, "bun test; cat src/lib.ts");

	expect(ran).toEqual(["bun test"]);
	expect(out.result).toMatchObject({
		stdout: expect.stringContaining("ok\nno such file"),
	});
});

test("a file the rest writes is read after the rest ran", async ($: Engine, on: On) => {
	scanner(on);
	let contents = "old";
	on("clock.now", () => ({ value: 0 }));
	on("session.cwd", () => ({ value: "/repo" }));
	on("fs.exists", () => ({ value: false }));
	on("tool.check", () => ({ decision: "allow" }));
	on("tool.call", { tool: ["Read"] }, () => ({
		result: contents,
		text: contents,
	}));
	on("tool.call", { tool: ["Bash"] }, () => {
		contents = "new";
		return {
			result: { stdout: "ok", stderr: "", interrupted: false },
			text: "ok",
		};
	});

	const out = await run($, "bun test > out.txt; cat out.txt");

	expect(out.result).toMatchObject({ stdout: "ok\nnew" });
});

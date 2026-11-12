import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

import { gonePath, read, run, vanishing } from "./gate.mock";

test("a copy to a file the session saw and that is gone now asks", async ($: Engine, on: On) => {
	const files = new Set(["/p/GOAL-1.txt", "/tmp/src.txt"]);
	vanishing(on, files);
	await read($, "/p/GOAL-1.txt");
	files.delete("/p/GOAL-1.txt");

	const verdict = await run($, "Bash", {
		command: "cp /tmp/src.txt GOAL-1.txt",
	});

	expect(verdict.decision).toBe("ask");
});

test("a Write of a file never seen passes", async ($: Engine, on: On) => {
	vanishing(on, new Set());

	const verdict = await run($, "Write", { file_path: "/p/new.txt" });

	expect(verdict.decision).toBe("allow");
});

test("recreating a file after the session's own rm passes", async ($: Engine, on: On) => {
	const files = new Set(["/p/a.txt"]);
	vanishing(on, files);
	await read($, "/p/a.txt");
	await run($, "Bash", { command: "rm a.txt" });
	files.delete("/p/a.txt");
	await $.tool.call({ tool: "Bash", command: "rm a.txt" });

	const verdict = await run($, "Write", { file_path: "/p/a.txt" });

	expect(verdict.decision).toBe("allow");
});

test("a Write over a file that exists passes", async ($: Engine, on: On) => {
	vanishing(on, new Set(["/p/a.txt"]));
	await read($, "/p/a.txt");

	const verdict = await run($, "Write", { file_path: "/p/a.txt" });

	expect(verdict.decision).toBe("allow");
});

test("a copy over a path the session saw, with a relative and an absolute spelling, asks", async ($: Engine, on: On) => {
	const files = new Set(["/p/sub/a.txt", "/tmp/src.txt"]);
	vanishing(on, files);
	await read($, "/p/sub/../sub/a.txt");
	files.delete("/p/sub/a.txt");

	const verdict = await run($, "Bash", {
		command: "cp /tmp/src.txt sub/a.txt",
	});

	expect(verdict.decision).toBe("ask");
});

test("an rm and a cp of the same path in one command passes", async ($: Engine, on: On) => {
	const files = new Set(["/p/a.txt", "/tmp/src.txt"]);
	vanishing(on, files);
	await read($, "/p/a.txt");
	files.delete("/p/a.txt");

	const verdict = await run($, "Bash", {
		command: "rm -f a.txt && cp /tmp/src.txt a.txt",
	});

	expect(verdict.decision).toBe("allow");
});

test("a file seen through a symlinked folder and recreated by its real path asks", async ($: Engine, on: On) => {
	const files = new Set(["/private/tmp/a.txt", "/p/src.txt"]);
	vanishing(on, files, { aliases: { "/tmp": "/private/tmp" } });
	await read($, "/tmp/a.txt");
	files.delete("/private/tmp/a.txt");

	const verdict = await run($, "Write", { file_path: "/private/tmp/a.txt" });

	expect(verdict.decision).toBe("ask");
});

test("a file seen by its real path and recreated through a symlinked folder asks", async ($: Engine, on: On) => {
	const files = new Set(["/private/tmp/a.txt", "/p/src.txt"]);
	vanishing(on, files, { aliases: { "/tmp": "/private/tmp" } });
	await read($, "/private/tmp/a.txt");
	files.delete("/private/tmp/a.txt");

	const verdict = await run($, "Bash", { command: "cp src.txt /tmp/a.txt" });

	expect(verdict.decision).toBe("ask");
});

test("a copy to a `~` path of a file the session saw that is gone now asks", async ($: Engine, on: On) => {
	const files = new Set(["/home/u/n.txt", "/p/src.txt"]);
	vanishing(on, files);
	await read($, "/home/u/n.txt");
	files.delete("/home/u/n.txt");

	const verdict = await run($, "Bash", { command: "cp src.txt ~/n.txt" });

	expect(verdict.decision).toBe("ask");
});

test("a `~` operand the session saw and a Write of its absolute path that is gone now asks", async ($: Engine, on: On) => {
	const files = new Set(["/home/u/n.txt"]);
	vanishing(on, files);
	await run($, "Bash", { command: "stat ~/n.txt" });
	files.delete("/home/u/n.txt");

	const verdict = await run($, "Write", { file_path: "/home/u/n.txt" });

	expect(verdict.decision).toBe("ask");
});

test("a `touch` of a file the session saw that is gone now asks", async ($: Engine, on: On) => {
	const files = gonePath(on);
	await read($, "/p/a.txt");
	files.delete("/p/a.txt");

	const verdict = await run($, "Bash", { command: "touch a.txt" });

	expect(verdict.decision).toBe("ask");
});

test("an `ln -s` over a file the session saw that is gone now asks", async ($: Engine, on: On) => {
	const files = gonePath(on);
	await read($, "/p/a.txt");
	files.delete("/p/a.txt");

	const verdict = await run($, "Bash", { command: "ln -s src.txt a.txt" });

	expect(verdict.decision).toBe("ask");
});

test("a file seen only in an `ls` of its folder and gone now asks on a copy", async ($: Engine, on: On) => {
	const files = new Set(["/p/sub/a.txt", "/p/src.txt"]);
	vanishing(on, files);
	await $.tool.call({ tool: "Bash", command: "ls sub" });
	files.delete("/p/sub/a.txt");

	const verdict = await run($, "Bash", { command: "cp src.txt sub/a.txt" });

	expect(verdict.decision).toBe("ask");
});

test("a file seen only in an `ls` of the working folder and gone now asks on a copy", async ($: Engine, on: On) => {
	const files = new Set(["/p/a.txt", "/p/src.txt"]);
	vanishing(on, files);
	await $.tool.call({ tool: "Bash", command: "ls -la" });
	files.delete("/p/a.txt");

	const verdict = await run($, "Bash", { command: "cp src.txt a.txt" });

	expect(verdict.decision).toBe("ask");
});

test("a file seen only in an agent's Glob and gone now asks on a Write", async ($: Engine, on: On) => {
	const files = new Set(["/p/sub/a.txt"]);
	on("tool.call", { tool: "Glob" }, () => ({ result: "/p/sub/a.txt" }));
	vanishing(on, files);
	await $.tool.call({ tool: "Glob", pattern: "*.txt", path: "/p/sub" });
	files.delete("/p/sub/a.txt");

	const verdict = await run($, "Write", { file_path: "/p/sub/a.txt" });

	expect(verdict.decision).toBe("ask");
});

test("an rm that left the file in place is no removal", async ($: Engine, on: On) => {
	const files = new Set(["/p/a.txt"]);
	vanishing(on, files);
	await read($, "/p/a.txt");
	await run($, "Bash", { command: "rm a.txt" });
	await $.tool.call({ tool: "Bash", command: "rm a.txt" });
	files.delete("/p/a.txt");

	const verdict = await run($, "Write", { file_path: "/p/a.txt" });

	expect(verdict.decision).toBe("ask");
});

test("a file read before a resume and gone now asks on a Write", async ($: Engine, on: On) => {
	const files = new Set(["/p/a.txt"]);
	vanishing(on, files, {
		history: [{ tool: "Read", input: { file_path: "/p/a.txt" } }],
	});
	files.delete("/p/a.txt");

	const verdict = await run($, "Write", { file_path: "/p/a.txt" });

	expect(verdict.decision).toBe("ask");
});

test("a file an agent's Glob listed before a resume and gone now asks on a Write", async ($: Engine, on: On) => {
	vanishing(on, new Set(), {
		history: [{ tool: "Glob", input: { pattern: "*.txt" }, text: "/p/a.txt" }],
	});

	const verdict = await run($, "Write", { file_path: "/p/a.txt" });

	expect(verdict.decision).toBe("ask");
});

test("a file removed by the session before a resume passes on a Write", async ($: Engine, on: On) => {
	const files = new Set<string>();
	vanishing(on, files, {
		history: [
			{ tool: "Read", input: { file_path: "/p/a.txt" } },
			{ tool: "Bash", input: { command: "rm a.txt" } },
		],
	});

	const verdict = await run($, "Write", { file_path: "/p/a.txt" });

	expect(verdict.decision).toBe("allow");
});

test("a Read that failed before a resume does not make the file seen", async ($: Engine, on: On) => {
	vanishing(on, new Set(), {
		history: [
			{ tool: "Read", input: { file_path: "/p/a.txt" }, isError: true },
		],
	});

	const verdict = await run($, "Write", { file_path: "/p/a.txt" });

	expect(verdict.decision).toBe("allow");
});

for (const pattern of [
	String.raw`'///\|Catalog/OrderedJSON'`,
	String.raw`"/\.git/"`,
]) {
	test(`a \`grep -v ${pattern}\` passes, since its pattern is no path the engine reaches`, async ($: Engine, on: On) => {
		vanishing(on, new Set());

		const verdict = await run($, "Bash", {
			command: `grep -v ${pattern} list.txt`,
		});

		expect(verdict.decision).toBe("allow");
	});
}

test("a call of the transcript still in flight does not make its file seen", async ($: Engine, on: On) => {
	vanishing(on, new Set(), {
		history: [
			{ tool: "Write", input: { file_path: "/p/a.txt" }, inFlight: true },
		],
	});

	const verdict = await run($, "Write", { file_path: "/p/a.txt" });

	expect(verdict.decision).toBe("allow");
});

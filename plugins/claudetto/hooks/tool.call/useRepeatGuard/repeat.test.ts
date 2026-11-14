import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

import { scanned } from "../../secrets.mock";

const FILE = Array.from({ length: 12 }, (_, i) => `line ${i + 1} of the file`);
const NUMBERED = FILE.map((line, i) => `     ${i + 1}\t${line}`).join("\n");

interface Answer {
	readonly text: string;
	readonly isReadOnly?: true;
}

/** Each `tool.call` answers what `answers` holds for its `tool_use_id`. */
const lab = (on: On, answers: Record<string, Answer>): void => {
	on(
		"process.run",
		(_$, e) =>
			scanned(e) ?? {
				value: {
					exitCode: 0,
					stdout: "",
					stderr: "",
					isStdoutTruncated: false,
					isStderrTruncated: false,
				},
			},
	);
	on("tool.call", (_$, e) => {
		const answer = answers[e.tool_use_id ?? ""] ?? { text: "" };
		return { result: { stdout: answer.text, stderr: "" }, ...answer };
	});
};

const read = ($: Engine, id: string, path: string) =>
	$.tool.call({ tool: "Read", tool_use_id: id, file_path: path });

const LIST = { text: "src/a.ts\nsrc/b.ts", isReadOnly: true } as const;

test("a read-only result the agent already holds is withheld, with the call that gave it", async ($: Engine, on: On) => {
	lab(on, { t1: LIST, t2: LIST });
	await read($, "t1", "/p/a.ts");
	const again = await read($, "t2", "/p/b.ts");

	expect(again.deny).toContain("`t1`");
});

test("the same text through another tool counts as held, line numbers aside", async ($: Engine, on: On) => {
	lab(on, {
		t1: { text: NUMBERED, isReadOnly: true },
		t2: { text: FILE.join("\n"), isReadOnly: true },
	});
	await $.tool.call({ tool: "Read", tool_use_id: "t1", file_path: "/p/f.txt" });
	const cat = await $.tool.call({
		tool: "Bash",
		tool_use_id: "t2",
		command: "cat /p/f.txt",
	});

	expect(cat.deny).toContain("`t1`");
});

test("a part of a held text is withheld", async ($: Engine, on: On) => {
	lab(on, {
		t1: { text: NUMBERED, isReadOnly: true },
		t2: { text: FILE.slice(2, 9).join("\n"), isReadOnly: true },
	});
	await $.tool.call({ tool: "Read", tool_use_id: "t1", file_path: "/p/f.txt" });
	const head = await $.tool.call({
		tool: "Bash",
		tool_use_id: "t2",
		command: "sed -n 3,9p /p/f.txt",
	});

	expect(head.deny).toContain("`t1`");
});

test("a changed result passes", async ($: Engine, on: On) => {
	lab(on, {
		t1: LIST,
		t2: { text: "src/a.ts\nsrc/b.ts\nsrc/c.ts", isReadOnly: true },
	});
	await read($, "t1", "/p/a.ts");
	const again = await read($, "t2", "/p/a.ts");

	expect(again.deny).toBeUndefined();
});

test("a command output that repeats whole is withheld", async ($: Engine, on: On) => {
	const run = { text: "1 fail" };
	lab(on, { t1: run, t2: run });
	await $.tool.call({ tool: "Bash", tool_use_id: "t1", command: "bun test" });
	const again = await $.tool.call({
		tool: "Bash",
		tool_use_id: "t2",
		command: "bun test",
	});

	expect(again.deny).toContain("`t1`");
});

test("an edit passes, though each edit answers the same text", async ($: Engine, on: On) => {
	const done = { text: "The file has been updated successfully." };
	lab(on, { t1: done, t2: done });
	const edit = (id: string) =>
		$.tool.call({
			tool: "Edit",
			tool_use_id: id,
			file_path: "/p/a.ts",
			old_string: id,
			new_string: `${id}!`,
		});
	await edit("t1");
	const again = await edit("t2");

	expect(again.deny).toBeUndefined();
});

test("a third repeat in a row asks the agent to act or report", async ($: Engine, on: On) => {
	lab(on, { t1: LIST, t2: LIST, t3: LIST, t4: LIST });
	await read($, "t1", "/p/a.ts");
	await read($, "t2", "/p/a.ts");
	await read($, "t3", "/p/a.ts");
	const fourth = await read($, "t4", "/p/a.ts");

	expect(fourth.deny).toContain("3 calls in a row");
});

test("after the session ends, nothing counts as held", async ($: Engine, on: On) => {
	lab(on, { t1: LIST, t2: LIST });
	await read($, "t1", "/p/a.ts");
	await $.session.end({
		reason: "clear",
		sessionId: "s1",
		resume: { id: "s1" },
	});
	const again = await read($, "t2", "/p/a.ts");

	expect(again.deny).toBeUndefined();
});

test("a read back of a file the agent wrote is withheld, with the write", async ($: Engine, on: On) => {
	lab(on, {
		t1: { text: "File created successfully." },
		t2: { text: NUMBERED, isReadOnly: true },
	});
	await $.tool.call({
		tool: "Write",
		tool_use_id: "t1",
		file_path: "/p/f.txt",
		content: `${FILE.join("\n")}\n`,
	});
	const back = await read($, "t2", "/p/f.txt");

	expect(back.deny).toContain("`t1`");
});

test("a read back of a file the agent edited is withheld, with the edit", async ($: Engine, on: On) => {
	const edited = NUMBERED.replace("line 4 of the file", "line four, edited");
	lab(on, {
		t1: { text: NUMBERED, isReadOnly: true },
		t2: { text: "The file has been updated successfully." },
		t3: { text: edited, isReadOnly: true },
	});
	await read($, "t1", "/p/f.txt");
	await $.tool.call({
		tool: "Edit",
		tool_use_id: "t2",
		file_path: "/p/f.txt",
		old_string: "line 4 of the file",
		new_string: "line four, edited",
	});
	const back = await read($, "t3", "/p/f.txt");

	expect(back.deny).toContain("`t2`");
});

test("a rerun that differs only in its timings is withheld", async ($: Engine, on: On) => {
	lab(on, {
		t1: { text: "3 pass [12ms]\nDone in 1.4s" },
		t2: { text: "3 pass [15ms]\nDone in 2s" },
	});
	await $.tool.call({ tool: "Bash", tool_use_id: "t1", command: "bun test" });
	const again = await $.tool.call({
		tool: "Bash",
		tool_use_id: "t2",
		command: "bun test 2>&1",
	});

	expect(again.deny).toContain("`t1`");
});

test("a change between repeats ends the run of misses", async ($: Engine, on: On) => {
	lab(on, {
		t1: LIST,
		t2: LIST,
		t3: { text: "File created successfully." },
		t4: LIST,
		t5: LIST,
	});
	await read($, "t1", "/p/a.ts");
	await read($, "t2", "/p/a.ts");
	await $.tool.call({
		tool: "Write",
		tool_use_id: "t3",
		file_path: "/p/b.ts",
		content: "b",
	});
	await read($, "t4", "/p/a.ts");
	const after = await read($, "t5", "/p/a.ts");

	expect(after.deny).not.toContain("in a row");
});

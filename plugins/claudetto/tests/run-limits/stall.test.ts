import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";
import { bareRepo } from "../gate/facts.ts";

const BLOCK = "The goal is not met: keep working.";

let blocking = true;

let editFails = false;

const lab = (on: On): string[] => {
	blocking = true;
	editFails = false;
	const lines: string[] = [];
	on("ui.log", (_$, e) => {
		lines.push(e.text);
		return { value: undefined };
	});
	on("classic.Stop", () => (blocking ? { block: BLOCK } : {}));
	// The gate block reads these facts before a file tool runs.
	bareRepo(on);
	on("session.cwd", () => ({ value: "/p" }));
	on("env.get", () => ({ value: undefined }));
	on("tool.call", () =>
		editFails
			? { isError: true, result: "no such file", text: "no such file" }
			: { result: {} },
	);
	return lines;
};

const stop = ($: Engine) =>
	$.classic.Stop({ stop_hook_active: true, background_tasks: [] });

const edit = ($: Engine) =>
	$.tool.call({
		tool: "Edit",
		tool_use_id: "t1",
		file_path: "/p/a.ts",
		old_string: "a",
		new_string: "b",
	});

test("two blocks with no file change show nothing and leave the block as it was", async ($: Engine, on: On) => {
	const lines = lab(on);

	await stop($);
	const second = await stop($);

	expect(lines).toEqual([]);
	expect(second.block).toBe(BLOCK);
});

test("a third block with no file change shows one line naming `/goal clear` and asks for a one-line answer", async ($: Engine, on: On) => {
	const lines = lab(on);

	await stop($);
	await stop($);
	const third = await stop($);

	expect(lines).toHaveLength(1);
	expect(lines[0]).toContain("`/goal clear`");
	expect(third.block).toContain(BLOCK);
	expect(third.block).toContain("one line");
});

test("the line is shown once while the loop goes on, and the block keeps asking for one line", async ($: Engine, on: On) => {
	const lines = lab(on);

	await stop($);
	await stop($);
	await stop($);
	const fourth = await stop($);

	expect(lines).toHaveLength(1);
	expect(fourth.block).toContain("one line");
});

test("a file written between the blocks starts the count again", async ($: Engine, on: On) => {
	const lines = lab(on);

	await stop($);
	await stop($);
	await edit($);
	const third = await stop($);

	expect(lines).toEqual([]);
	expect(third.block).toBe(BLOCK);
});

test("an `Edit` that errors between the blocks writes nothing, so the third block still shows the line", async ($: Engine, on: On) => {
	const lines = lab(on);
	editFails = true;

	await stop($);
	await stop($);
	await edit($);
	await stop($);

	expect(lines).toHaveLength(1);
});

test("a Stop that nothing blocks starts the count again", async ($: Engine, on: On) => {
	const lines = lab(on);
	await stop($);
	await stop($);
	blocking = false;
	await stop($);
	blocking = true;

	const next = await stop($);

	expect(lines).toEqual([]);
	expect(next.block).toBe(BLOCK);
});

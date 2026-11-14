import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

import { lab } from "./repeat.mock";

test("a command that prints nothing passes, though each such run reads the same", async ($: Engine, on: On) => {
	const silent = { text: "(Bash completed with no output)", stdout: "" };
	lab(on, { t1: silent, t2: silent });
	await $.tool.call({
		tool: "Bash",
		tool_use_id: "t1",
		command: "grep -q x a",
	});
	const edit = await $.tool.call({
		tool: "Bash",
		tool_use_id: "t2",
		command: "python3 edit.py",
	});

	expect(edit.deny).toBeUndefined();
});

test("a check rerun after an edit passes, though it prints what it printed before", async ($: Engine, on: On) => {
	const pass = { text: "3 pass" };
	lab(on, {
		t1: pass,
		t2: { text: "The file has been updated successfully." },
		t3: pass,
	});
	await $.tool.call({ tool: "Bash", tool_use_id: "t1", command: "bun test" });
	await $.tool.call({
		tool: "Edit",
		tool_use_id: "t2",
		file_path: "/p/a.ts",
		old_string: "a",
		new_string: "b",
	});
	const again = await $.tool.call({
		tool: "Bash",
		tool_use_id: "t3",
		command: "bun test",
	});

	expect(again.deny).toBeUndefined();
});

test("a check rerun after a command that wrote silently passes", async ($: Engine, on: On) => {
	const pass = { text: "3 pass" };
	lab(on, {
		t1: pass,
		t2: { text: "(Bash completed with no output)", stdout: "" },
		t3: pass,
	});
	await $.tool.call({ tool: "Bash", tool_use_id: "t1", command: "bun test" });
	await $.tool.call({
		tool: "Bash",
		tool_use_id: "t2",
		command: "sed -i '' s/a/b/ a.ts",
	});
	const again = await $.tool.call({
		tool: "Bash",
		tool_use_id: "t3",
		command: "bun test",
	});

	expect(again.deny).toBeUndefined();
});

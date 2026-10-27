// Lab tests of the proof of an edit in the `protect` slice (spec `session-hygiene`, "Edit Proof Spares a Write"): a `Write` of another session or agent during a `Bash` call is no effect of that call.
// The stubs are in `stubs/protect.ts`, and the ledger is the store of `stubs/store.ts`.

import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";
import { after, before, listed, stub } from "./stubs/protect.ts";
import { stubStore } from "./stubs/store.ts";

const PROPOSAL = "/p/openspec/changes/x/proposal.md";

/** True when the undo ran `rm`. */
const removed = (runs: string[][]) =>
	runs.some((run) => run[0]?.endsWith("rm"));

/** The `Write` call of `text` to `PROPOSAL` by another session, as its `PreToolUse` sees it. The file changes as the tool does. */
const write = async (
	$: Engine,
	files: Record<string, string>,
	text: string,
) => {
	await $.tool.call({
		tool: "Write",
		tool_use_id: "w1",
		file_path: PROPOSAL,
		content: text,
	});
	files[PROPOSAL] = text;
};

test("Concurrent Write: a file that a `Write` creates during a `Bash` call stays", async ($: Engine, on: On) => {
	const world = stub(on, {});
	stubStore(on);
	await before($);
	await write($, world.files, "## Why\n");
	await after($, listed(PROPOSAL));
	expect(world.files[PROPOSAL]).toBe("## Why\n");
	expect(removed(world.runs)).toBe(false);
});

test("Concurrent Write: a file that a `Write` changes during a `Bash` call stays", async ($: Engine, on: On) => {
	const world = stub(on, { [PROPOSAL]: "one\n" });
	stubStore(on);
	await before($);
	await write($, world.files, "two\n");
	await after($, listed(PROPOSAL));
	expect(world.files[PROPOSAL]).toBe("two\n");
});

test("Bash Change: a `Bash` change of a file that the ledger holds with another hash is written back", async ($: Engine, on: On) => {
	const world = stub(on, { [PROPOSAL]: "one\n" });
	stubStore(on);
	await write($, world.files, "two\n");
	await before($);
	world.files[PROPOSAL] = "three\n";
	await after($, listed(PROPOSAL));
	expect(world.files[PROPOSAL]).toBe("two\n");
});

test("Bash Creation: a `Bash` file with no ledger line is deleted", async ($: Engine, on: On) => {
	const world = stub(on, {});
	stubStore(on);
	await before($);
	world.files[PROPOSAL] = "made by bash\n";
	await after($, listed(PROPOSAL));
	expect(removed(world.runs)).toBe(true);
});

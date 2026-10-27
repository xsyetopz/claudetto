// The folders of the main status line: `workspace.current_dir`, `workspace.project_dir`, and `cwd` are used only when each is a non-empty string.

import { expect, test } from "bun:test";
import { main } from "../../../plugins/claudetto/modules/statusline/adapters/cli.ts";
import { depsFor, type Run, STATUS } from "./support.ts";

const renderOf = async (input: unknown): Promise<Run> => {
	const run: Run = { status: -1, out: [], err: [] };
	run.status = await main(
		[],
		depsFor(input, run, { env: { COLUMNS: "124", NO_COLOR: "1" } }),
	);
	return run;
};

test("a `current_dir` that is `null` and a `cwd` that is a number fall back to the folder of the process, with no error", async () => {
	const run = await renderOf({
		...STATUS,
		workspace: { current_dir: null, project_dir: null },
		cwd: 5,
	});
	expect(run.err).toStrictEqual([]);
	expect(run.out[0]).toContain("claudetto");
});

test("a `project_dir` that is not a string gives the same folder as `current_dir`, and no error", async () => {
	const run = await renderOf({
		...STATUS,
		workspace: { current_dir: "/work/app", project_dir: 7 },
	});
	expect(run.err).toStrictEqual([]);
	expect(run.out[0]).toContain("app");
});

test("an empty `current_dir` falls back to `cwd`", async () => {
	const run = await renderOf({
		...STATUS,
		workspace: { current_dir: "", project_dir: "" },
		cwd: "/work/tool",
	});
	expect(run.err).toStrictEqual([]);
	expect(run.out[0]).toContain("tool");
});

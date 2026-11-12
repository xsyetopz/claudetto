import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

import {
	A,
	bash,
	edit,
	fakeRepo,
	lab,
	started,
	stop,
	submit,
} from "./slices.mock.ts";
import { SLICE_COMMIT } from "./texts.ts";

test("a file changed through Bash, such as sed -i, is not the agent's and is asked for under its source", async ($: Engine, on: On) => {
	const repo = await started($, on);
	repo.dirty["/repo/src/b.ts"] = " M";
	repo.hash["/repo/src/b.ts"] = "h1";
	await bash($, "sed -i s/a/b/ src/b.ts");
	const out = await stop($);
	expect(out.block).toBe(SLICE_COMMIT([], ["src/b.ts"]));
});

test("a file another hand changed after the agent wrote it is asked for under its source, not as the agent's", async ($: Engine, on: On) => {
	const repo = await started($, on, { [A]: " M" });
	await edit($);
	repo.hash[A] = "user";
	const out = await stop($);
	expect(out.block).toBe(SLICE_COMMIT([], ["src/a.ts"]));
});

test("a file dirty before the session and not moved is left alone", async ($: Engine, on: On) => {
	lab(on, fakeRepo({ [A]: " M" }));
	await submit($);
	await bash($, "ls");
	const awaited13 = await stop($);
	expect(awaited13.block).toBeUndefined();
});

test("a file dirty before the session that Bash then changes is asked for under its source", async ($: Engine, on: On) => {
	const repo = await started($, on, { [A]: " M" });
	repo.hash[A] = "h1";
	await bash($, "sed -i s/a/b/ src/a.ts");
	const awaited14 = await stop($);
	expect(awaited14.block).toBe(SLICE_COMMIT([], ["src/a.ts"]));
});

test("Denied Write: a write the sandbox refused marks no file, so the stop passes", async ($: Engine, on: On) => {
	const skill = "/repo/.claude/skills/openspec-propose/SKILL.md";
	lab(
		on,
		fakeRepo({ [skill]: " D" }),
		"allow",
		[],
		undefined,
		{},
		{
			isError: true,
			result: "denied",
			text: "denied",
		},
	);
	await submit($);
	await $.tool.call({
		tool: "Write",
		tool_use_id: "t4",
		file_path: skill,
		content: "x",
	});
	const awaited15 = await stop($);
	expect(awaited15.block).toBeUndefined();
});

test("A Dependency Bump Nobody Claimed: after the agent's slice is committed, the install's files are asked for as their own commit that names the source", async ($: Engine, on: On) => {
	const repo = await started($, on);
	await edit($);
	repo.dirty["/repo/package.json"] = " M";
	repo.dirty["/repo/bun.lock"] = " M";
	repo.hash["/repo/package.json"] = "p1";
	repo.hash["/repo/bun.lock"] = "l1";
	const out = await stop($);
	expect(out.block).toBe(SLICE_COMMIT([], ["package.json", "bun.lock"]));
});

test("The Person Said Not to Commit: a no-commit constraint asks for no commit of another's files", async ($: Engine, on: On) => {
	const repo = fakeRepo();
	lab(on, repo, "deny");
	await submit($);
	repo.dirty["/repo/package.json"] = " M";
	repo.hash["/repo/package.json"] = "p1";
	const awaited17 = await stop($);
	expect(awaited17.block).toBeUndefined();
});

test("a stop with both lists names the agent's files under its own heading and the others under theirs", async ($: Engine, on: On) => {
	const repo = await started($, on, { [A]: " M" });
	repo.hash[A] = "h1";
	await edit($);
	repo.dirty["/repo/README.md"] = " M";
	repo.hash["/repo/README.md"] = "u";
	const out = await stop($);
	expect(out.block).toBe(SLICE_COMMIT(["src/a.ts"], ["README.md"]));
});

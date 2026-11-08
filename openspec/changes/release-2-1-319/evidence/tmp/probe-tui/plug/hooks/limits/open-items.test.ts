import type { On, PluginOptions, SessionMessage } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

const said = (role: SessionMessage["role"], text: string): SessionMessage => ({
	role,
	text,
	toolUses: [],
});

const withUse = (use: {
	tool: string;
	isError?: true;
	text?: string;
}): SessionMessage => ({
	role: "assistant",
	text: "",
	toolUses: [{ tool_use_id: "t1", input: {}, ...use }],
});

const lab = (on: On, ...turn: SessionMessage[]): void => {
	on("classic.Stop", () => ({}));
	on("clock.now", () => ({ value: 0 }));
	on("session.cwd", () => ({ value: "/repo" }));
	on("session.messages", () => ({ value: [said("user", "go"), ...turn] }));
};

const stop = (
	$: Engine,
	reply: string,
	stopHookActive = false,
): Promise<{ block?: string }> =>
	$.classic.Stop({
		stop_hook_active: stopHookActive,
		last_assistant_message: reply,
		background_tasks: [],
	});

const off = (): { options: PluginOptions } => ({
	options: { openItemsCheckEnabled: false },
});

test("prose that mentions a remaining budget passes", async ($: Engine, on: On) => {
	lab(on);

	const out = await stop(
		$,
		"Remaining budget is fine.\n- edited a.ts\n- edited b.ts",
	);

	expect(out.block).toBeUndefined();
});

test("a done task item passes", async ($: Engine, on: On) => {
	lab(on);

	const out = await stop($, "- [x] add the test");

	expect(out.block).toBeUndefined();
});

test("a blocker word in an open item is no blocker", async ($: Engine, on: On) => {
	lab(on);

	const permission = await stop($, "- [ ] add the permission check to gate.ts");
	const approval = await stop($, "- [ ] write the approval test");

	expect(permission.block).toContain("add the permission check to gate.ts");
	expect(approval.block).toContain("write the approval test");
});

test("open items block under any heading or none", async ($: Engine, on: On) => {
	lab(on);

	const open = await stop($, "## Open\n- [ ] wire the hook");
	const need = await stop($, "## What I Need from You\n- [ ] pick a name");
	const bare = await stop($, "- [ ] run it");

	expect(open.block).toContain("wire the hook");
	expect(need.block).toContain("pick a name");
	expect(bare.block).toContain("run it");
});

test("a plain bullet under an Open heading is no task item", async ($: Engine, on: On) => {
	lab(on);

	const out = await stop($, "## Open\n- wire the hook");

	expect(out.block).toBeUndefined();
});

test("an offer in the last line blocks and is named", async ($: Engine, on: On) => {
	lab(on);

	const out = await stop(
		$,
		"The fix is in.\n\nWant me to write the test next?\n",
	);

	expect(out.block).toContain("Want me to write the test next?");
});

test("a question in the middle of the reply is no offer", async ($: Engine, on: On) => {
	lab(on);

	const out = await stop($, "Why did it fail? The path was wrong.\nFixed.");

	expect(out.block).toBeUndefined();
});

test("an open item that gives a `! command` passes, a paid run included", async ($: Engine, on: On) => {
	lab(on);

	const out = await stop(
		$,
		"- [ ] paid eval: approve it with `! bun run paid-eval`",
	);

	expect(out.block).toBeUndefined();
});

test("an open item with no denial, command, or open question blocks and says so", async ($: Engine, on: On) => {
	lab(on);

	const out = await stop($, "- [ ] push to origin");

	expect(out.block).toContain(
		"no denial, `! <command>`, or open question in this turn",
	);
});

test("a refused call in the turn is the blocker of an open item", async ($: Engine, on: On) => {
	lab(on, withUse({ tool: "Bash", isError: true }));

	const out = await stop($, "- [ ] push to origin");

	expect(out.block).toBeUndefined();
});

test("an open AskUserQuestion is the blocker of an open item", async ($: Engine, on: On) => {
	lab(on, withUse({ tool: "AskUserQuestion" }));

	const out = await stop($, "- [ ] pick a name");

	expect(out.block).toBeUndefined();
});

test("the second Stop of a continued turn passes", async ($: Engine, on: On) => {
	lab(on);

	const out = await stop($, "- [ ] add the test", true);

	expect(out.block).toBeUndefined();
});

test("a block of another hook stands and adds nothing", async ($: Engine, on: On) => {
	on("classic.Stop", () => ({ block: "tests are red" }));
	on("session.messages", () => ({ value: [said("user", "go")] }));
	on("tool.call", () => ({ result: {} }));
	on("clock.now", () => ({ value: 0 }));
	on("session.cwd", () => ({ value: "/repo" }));
	await $.tool.call({
		tool: "Edit",
		tool_use_id: "t1",
		file_path: "/p/a.ts",
		old_string: "a",
		new_string: "b",
	});

	const out = await stop($, "- [ ] add the test");

	expect(out.block).toBe("tests are red");
});

test(
	"openItemsCheckEnabled false blocks nothing",
	off(),
	async ($: Engine, on: On) => {
		lab(on);

		const out = await stop($, "- [ ] add the test");

		expect(out.block).toBeUndefined();
	},
);

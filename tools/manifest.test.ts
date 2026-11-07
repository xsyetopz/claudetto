import { expect, test } from "bun:test";
import { file, spawn } from "bun";

const PATH_CHOICE = /compaction|summary/i;

// The lab cannot read the manifest: a hooks module imports only its own code and "claude-code".
test("no plugin option chooses the compaction path or a summary model", async () => {
	const { userConfig } = await file(
		`${import.meta.dir}/../plugins/claudetto/.claude-plugin/plugin.json`,
	).json();
	const keys = Object.keys(userConfig);

	expect(keys).toContain("handoverThresholdTokens");
	expect(keys.filter((k) => PATH_CHOICE.test(k))).toEqual([]);
});

// 18.28: the hooks module serves /claudetto:setup, and a registered command cannot keep the prefix, so the file holds only the description.
test("the setup command file holds no text beyond its description", async () => {
	const text = await file(
		`${import.meta.dir}/../plugins/claudetto/commands/setup.md`,
	).text();

	expect(text.split("\n---\n")[1]?.trim()).toBe("");
});

// 18.26: a subagent's requests are cached 5m unless its frontmatter says 1h; the plugin is for subscribers, so 1h costs them nothing more.
for (const name of ["Artemis", "Metis", "Heracles"]) {
	test(`the ${name} agent asks for a one hour prompt cache`, async () => {
		const text = await file(
			`${import.meta.dir}/../plugins/claudetto/agents/${name}.md`,
		).text();

		expect(text.split("\n---\n")[0]).toContain(
			"\nexperimental:\n  cacheTtl: 1h",
		);
	});
}

// `limits/open-items.ts` reads only `- [ ]` lines, so a request in any other form escapes the Stop check.
test("the output style asks for the open-item form the Stop check reads", async () => {
	const style = await file(
		`${import.meta.dir}/../plugins/claudetto/output-styles/Concise.md`,
	).text();
	const requests = style.slice(
		style.indexOf("<requests_to_the_user>"),
		style.indexOf("</requests_to_the_user>"),
	);

	expect(requests).toContain(
		"as a `- [ ] ! <command>` item under one `## What I Need from You` heading",
	);
	expect(requests).toContain(
		"Ask each question for the user with `AskUserQuestion`",
	);
	expect(requests).toContain(
		"Ask through the popup before you assume or guess anything the request leaves open.",
	);
});

// 18.24: the two reader rules sit in the style's `<sentence_style>`, outside `<requests_to_the_user>`.
test("the output style says what an agent message and a user reply hold", async () => {
	const style = await file(
		`${import.meta.dir}/../plugins/claudetto/output-styles/Concise.md`,
	).text();
	const rules = style.slice(
		style.indexOf("<sentence_style>"),
		style.indexOf("</sentence_style>"),
	);

	expect(rules).toContain(
		"holds only what the agent cannot find itself: the task, the inputs it lacks, and the done-check, in the fewest words, with no greeting, thanks, or context it can read",
	);
	expect(rules).toContain(
		"Send one message per agent, and send a follow-up only when its report leaves the task undone",
	);
	expect(rules).toContain(
		"plain English a non-expert can follow, with no pleasantries, praise, or filler",
	);
});

// 18.28: with the hooks module not running, the setup command would reach Claude as bare tags, so a plain hook blocks it; the module's `command.run` serves it first when it runs.
const runPromptHook = async (prompt: string): Promise<string> => {
	const { hooks } = await file(
		`${import.meta.dir}/../plugins/claudetto/hooks/hooks.json`,
	).json();
	const proc = spawn(["sh", "-c", hooks.UserPromptSubmit[0].hooks[0].command], {
		stdin: new TextEncoder().encode(
			JSON.stringify({ hook_event_name: "UserPromptSubmit", prompt }),
		),
		stdout: "pipe",
	});
	return await new Response(proc.stdout).text();
};

test("a prompt that starts with /claudetto:setup is blocked with a plain reason", async () => {
	const outs = await Promise.all(
		["/claudetto:setup", "/claudetto:setup now"].map(runPromptHook),
	);
	for (const out of outs.map((o) => JSON.parse(o))) {
		expect(out.decision).toBe("block");
		expect(out.reason).toContain("Restart Claude Code");
	}
});

test("other prompts are not blocked", async () => {
	const outs = [
		"hello",
		"/claudetto:handoff",
		"run /claudetto:setup",
		"/claudetto:setupx",
	].map(runPromptHook);
	expect(await Promise.all(outs)).toEqual(["", "", "", ""]);
});

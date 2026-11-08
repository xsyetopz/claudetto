import { expect, test } from "bun:test";
import { mkdtemp } from "node:fs/promises";
import { availableParallelism, tmpdir } from "node:os";
import { join } from "node:path";
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
		"holds only the task, the inputs it lacks, and the done-check, with no greeting, thanks, or context it can read",
	);
	expect(rules).toContain(
		"send one per agent, and a follow-up only when its report leaves the task undone",
	);
	expect(rules).toContain(
		"plain English a non-expert can follow, with no pleasantries, praise, or filler",
	);
});

// 18.28: with the hooks module not running, the setup command would reach Claude as bare tags, so a plain hook blocks it; the module's `command.run` serves it first when it runs.
const hookCommand = async (event: string): Promise<string> =>
	(await file(`${import.meta.dir}/../plugins/claudetto/hooks/hooks.json`).json())
		.hooks[event][0].hooks[0].command;

const runPromptHook = async (prompt: string): Promise<string> => {
	const proc = spawn(["sh", "-c", await hookCommand("UserPromptSubmit")], {
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

// Claude's Bash commands source this file: nice 10 lets the user's apps win the CPU, and one core stays out of cargo and Go builds. `make` and CMake are left alone, since make runs one job by default.
const startedShell = async (env: Record<string, string>): Promise<string> => {
	const envFile = join(await mkdtemp(join(tmpdir(), "envfile-")), "env");
	const run = async (command: string) =>
		await new Response(
			spawn(["sh", "-c", command], {
				env: { ...process.env, ...env, CLAUDE_ENV_FILE: envFile },
				stdout: "pipe",
			}).stdout,
		).text();
	const start = await hookCommand("SessionStart");
	await run(start);
	await run(start);
	return await run(
		`. "$CLAUDE_ENV_FILE"; echo $(ps -o nice= -p $$) $CARGO_BUILD_JOBS $GOMAXPROCS`,
	);
};

test("a Bash command runs at nice 10 with one core kept out of cargo and Go, after two session starts", async () => {
	const jobs = Math.max(availableParallelism() - 1, 1);
	expect((await startedShell({})).trim()).toBe(`10 ${jobs} ${jobs}`);
});

test("a job count the user set is kept", async () => {
	expect(
		(await startedShell({ CARGO_BUILD_JOBS: "3", GOMAXPROCS: "2" })).trim(),
	).toBe("10 3 2");
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

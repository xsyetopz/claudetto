import { expect, test } from "bun:test";
import { mkdtemp } from "node:fs/promises";
import { availableParallelism, tmpdir, totalmem } from "node:os";
import { join } from "node:path";

import { file, spawn } from "bun";

const PATH_CHOICE = /compaction|summary/iu;

const recordOf = (value: unknown): Record<string, unknown> => {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		throw new Error("not an object");
	}
	return Object.fromEntries(Object.entries(value));
};
const firstOf = (value: unknown): unknown => {
	if (!Array.isArray(value)) {
		throw new TypeError("not a list");
	}
	return value[0];
};

// The lab cannot read the manifest: a hooks module imports only its own code and "claude-code".
test("no plugin option chooses the compaction path or a summary model", async () => {
	const plugin: unknown = await file(
		`${import.meta.dir}/../plugins/claudetto/.claude-plugin/plugin.json`,
	).json();
	const keys = Object.keys(recordOf(recordOf(plugin).userConfig));

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

// The `subagentPromptCacheTtl` setting outranks frontmatter `cacheTtl`, so setup's setting is the one place the TTL is set.
for (const name of ["Artemis", "Metis", "Heracles"]) {
	test(`the ${name} agent sets no prompt cache TTL`, async () => {
		const text = await file(
			`${import.meta.dir}/../plugins/claudetto/agents/${name}.md`,
		).text();

		expect(text).not.toContain("cacheTtl");
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
		"as a `- ! <command>` bullet under one `## What I Need From You` heading",
	);
	expect(requests).toContain(
		"Ask each question for the user once, through the popup (`mcp__claudetto__ask-user-question`), and repeat it nowhere in the reply.",
	);
	expect(requests).toContain(
		"such a bullet holds that command and never a question.",
	);
	expect(requests).toContain(
		"Ask through the popup only for what the user alone holds; settle the rest from the conversation and the repository, and state your reading.",
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
		"holds only the task, the inputs it lacks, and the done-check;",
	);
	expect(rules).toContain(
		"send one per agent, and a follow-up only when its report leaves the task undone",
	);
	expect(rules).toContain(
		"each sentence carries a fact, a result, or a step the person has not yet seen",
	);
});

// 18.28: with the hooks module not running, the setup command would reach Claude as bare tags, so a plain hook blocks it; the module's `command.run` serves it first when it runs.
const hookCommand = async (event: string): Promise<string> => {
	const config: unknown = await file(
		`${import.meta.dir}/../plugins/claudetto/hooks/hooks.json`,
	).json();
	const group = recordOf(firstOf(recordOf(recordOf(config).hooks)[event]));
	const { command } = recordOf(firstOf(group.hooks));
	if (typeof command !== "string") {
		throw new TypeError(`the ${event} hook has no command`);
	}
	return command;
};

const runPromptHook = async (prompt: string): Promise<string> => {
	const proc = spawn(["sh", "-c", await hookCommand("UserPromptSubmit")], {
		stdin: new TextEncoder().encode(
			JSON.stringify({ hook_event_name: "UserPromptSubmit", prompt }),
		),
		stdout: "pipe",
	});
	return new Response(proc.stdout).text();
};

test("a prompt that starts with /claudetto:setup is blocked with a plain reason", async () => {
	const outs = await Promise.all(
		["/claudetto:setup", "/claudetto:setup now"].map((entry) =>
			runPromptHook(entry),
		),
	);
	for (const out of outs.map((o) => recordOf(JSON.parse(o)))) {
		expect(out.decision).toBe("block");
		expect(String(out.reason)).toContain("Restart Claude Code");
	}
});

// Claude's Bash commands source this file: nice 10 lets the user's apps win the CPU, and one core stays out of cargo and Go builds. `make` and CMake are left alone, since make runs one job by default.
const startedShell = async (env: Record<string, string>): Promise<string> => {
	const envFile = join(await mkdtemp(join(tmpdir(), "envfile-")), "env");
	const run = (command: string) =>
		new Response(
			spawn(["sh", "-c", command], {
				env: { ...process.env, ...env, CLAUDE_ENV_FILE: envFile },
				stdout: "pipe",
			}).stdout,
		).text();
	const start = await hookCommand("SessionStart");
	await run(start);
	await run(start);
	return run(
		`. "$CLAUDE_ENV_FILE"; echo $(ps -o nice= -p $$) $CARGO_BUILD_JOBS $GOMAXPROCS $GOMEMLIMIT`,
	);
};

test("a Bash command runs at nice 10 with one core kept out of cargo and Go and Go's heap held to a quarter of memory, after two session starts", async () => {
	const jobs = Math.max(availableParallelism() - 1, 1);
	const quarter = Math.floor(totalmem() / 4_194_304);
	const awaited = await startedShell({});
	expect(awaited.trim()).toBe(`10 ${jobs} ${jobs} ${quarter}MiB`);
});

test("a job count and a memory limit the user set are kept", async () => {
	const awaited2 = await startedShell({
		CARGO_BUILD_JOBS: "3",
		GOMAXPROCS: "2",
		GOMEMLIMIT: "1GiB",
	});
	expect(awaited2.trim()).toBe("10 3 2 1GiB");
});

test("other prompts are not blocked", async () => {
	const outs = [
		"hello",
		"/claudetto:handoff",
		"run /claudetto:setup",
		"/claudetto:setupx",
	].map((entry) => runPromptHook(entry));
	expect(await Promise.all(outs)).toEqual(["", "", "", ""]);
});

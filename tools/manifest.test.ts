import { expect, test } from "bun:test";
import { availableParallelism, totalmem } from "node:os";
import { join } from "node:path";

import { file, spawn } from "bun";

import { tempDir } from "./temp.mock.ts";

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
const optionKeys = async (): Promise<string[]> => {
	const plugin: unknown = await file(
		`${import.meta.dir}/../plugins/claudetto/.claude-plugin/plugin.json`,
	).json();
	return Object.keys(recordOf(recordOf(plugin).userConfig));
};

test("no plugin option chooses the compaction path or a summary model", async () => {
	const keys = await optionKeys();

	expect(keys.filter((k) => PATH_CHOICE.test(k))).toEqual([]);
});

test("The Removed Option: no plugin option holds the TypeSafe key", async () => {
	expect(await optionKeys()).not.toContain("typesafeApiKey");
});

// 18.28: the hooks module serves /claudetto:setup, and a registered command cannot keep the prefix, so the file holds only the description.
test("the setup command file holds no text beyond its description", async () => {
	const text = await file(
		`${import.meta.dir}/../plugins/claudetto/commands/setup.md`,
	).text();

	expect(text.split("\n---\n")[1]?.trim()).toBe("");
});

// The `subagentPromptCacheTtl` setting outranks frontmatter `cacheTtl`, so setup's setting is the one place the TTL is set.
for (const name of ["Artemis", "Metis", "Athena", "Heracles"]) {
	test(`the ${name} agent sets no prompt cache TTL`, async () => {
		const text = await file(
			`${import.meta.dir}/../plugins/claudetto/agents/${name}.md`,
		).text();

		expect(text).not.toContain("cacheTtl");
	});
}

test("the output style fits 2,000 characters", async () => {
	const style = await file(
		`${import.meta.dir}/../plugins/claudetto/output-styles/Concise.md`,
	).text();

	expect(style.split("\n---\n")[1]?.length).toBeLessThanOrEqual(2000);
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
const startedShell = async (env: Record<string, string>) => {
	const envFile = join(await tempDir("envfile-"), "env");
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
	return {
		envFile,
		start: () => run(start),
		print: async (command: string): Promise<string> => {
			const out = await run(`. "$CLAUDE_ENV_FILE"; ${command}`);
			return out.trim();
		},
	};
};

const isRefused = async (command: string): Promise<boolean> => {
	const probe = spawn(["sh", "-c", command], {
		stdout: "ignore",
		stderr: "ignore",
	});
	return (await probe.exited) !== 0;
};

test("a Bash command keeps one core out of cargo and Go, after two session starts", async () => {
	const jobs = Math.max(availableParallelism() - 1, 1);
	const shell = await startedShell({});
	expect(await shell.print("echo $CARGO_BUILD_JOBS $GOMAXPROCS")).toBe(
		`${jobs} ${jobs}`,
	);
});

// The Claude Code sandbox refuses `sysctl`, so the hook cannot read the memory size there and sets no limit.
test.skipIf(await isRefused("sysctl -n hw.memsize || getconf _PHYS_PAGES"))(
	"a Bash command holds Go's heap to a quarter of memory (skipped where the memory size cannot be read)",
	async () => {
		const quarter = Math.floor(totalmem() / 4_194_304);
		const shell = await startedShell({});
		expect(await shell.print("echo $GOMEMLIMIT")).toBe(`${quarter}MiB`);
	},
);

// The Claude Code sandbox refuses `renice` and `ps`, so a sandboxed command stays at niceness 0.
test.skipIf(await isRefused("renice 10 -p $$"))(
	"a Bash command runs at nice 10 (skipped where `renice` is refused)",
	async () => {
		const shell = await startedShell({});
		expect(await shell.print("perl -e 'print getpriority(0,0)'")).toBe("10");
	},
);

test("a job count and a memory limit the user set are kept", async () => {
	const shell = await startedShell({
		CARGO_BUILD_JOBS: "3",
		GOMAXPROCS: "2",
		GOMEMLIMIT: "1GiB",
	});
	expect(
		await shell.print("echo $CARGO_BUILD_JOBS $GOMAXPROCS $GOMEMLIMIT"),
	).toBe("3 2 1GiB");
});

test("after three session starts the env file holds the renice line once", async () => {
	const shell = await startedShell({});
	await shell.start();
	const text = await file(shell.envFile).text();
	const copies = text.split("\n").filter((line) => line.startsWith("renice "));
	expect(copies).toHaveLength(1);
});

test("other prompts are not blocked", async () => {
	const outs = ["hello", "run /claudetto:setup", "/claudetto:setupx"].map(
		(entry) => runPromptHook(entry),
	);
	expect(await Promise.all(outs)).toEqual(["", "", ""]);
});

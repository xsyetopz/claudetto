// Real `claude -p` sessions with the claudetto plugin: the fake API scripts the model, and Claude Code runs every hook.
import { expect, test } from "bun:test";
import { mkdir, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { isRecord } from "../../plugins/claudetto/hooks/tools";
import { denyText } from "../../plugins/claudetto/scripts/protected-switch";
import { contextOf } from "../../plugins/claudetto/scripts/session-start";
import { type ClaudeRun, claudeRun } from "./claude-run";

const TIMEOUT = 120_000;
const SKILL = ".claude/skills/one/SKILL.md";

const bunOutput: unknown = JSON.parse(contextOf("bun"));
const bunHook = isRecord(bunOutput) ? bunOutput["hookSpecificOutput"] : {};
const BUN_CONTEXT = isRecord(bunHook)
	? String(bunHook["additionalContext"])
	: "";

const bash = (command: string) => ({
	tool: "Bash",
	input: { command, description: "step" },
});

const folder = (name: string) => mkdtemp(join(tmpdir(), `${name}-`));

const git = (dir: string, ...argv: string[]) =>
	Bun.$`git -c user.name=t -c user.email=t@t -c commit.gpgsign=false ${argv}`
		.cwd(dir)
		.quiet();

// A repo whose `main` and `other` branches differ in a skill file, and `same` matches `main`.
const repo = async (): Promise<string> => {
	const dir = await folder("claude-session-repo");
	await git(dir, "init", "-q", "-b", "main");
	await mkdir(join(dir, ".claude/skills/one"), { recursive: true });
	await Bun.write(join(dir, SKILL), "main");
	await git(dir, "add", "-A");
	await git(dir, "commit", "-q", "-m", "main");
	await git(dir, "branch", "same");
	await git(dir, "switch", "-q", "-c", "other");
	await Bun.write(join(dir, SKILL), "other");
	await git(dir, "commit", "-q", "-am", "other");
	await git(dir, "switch", "-q", "main");
	return dir;
};

const systemText = (run: ClaudeRun): string =>
	JSON.stringify(run.requests[0]?.["system"] ?? "");

const claudettoErrors = (run: ClaudeRun): string[] =>
	run.debug
		.split("\n")
		.filter((l) => l.includes("[ERROR]") && l.includes("claudetto"));

for (const model of [
	"claude-opus-5-5",
	"claude-sonnet-5-5",
	"claude-haiku-5-5",
]) {
	test(
		`${model} gets claudetto's system prompt, the plugin logs no error, and the session ends at once`,
		async () => {
			const started = Date.now();
			const run = await claudeRun({
				cwd: await folder("claude-session"),
				model,
				script: [{ text: "Done." }],
			});

			expect(systemText(run)).toContain(
				"You are a junior software engineer in user's repository.",
			);
			expect(claudettoErrors(run)).toEqual([]);
			expect(run.debug).not.toContain("was not resolved");
			expect(JSON.stringify(run.requests[0]?.["messages"])).not.toContain(
				"Package manager of this project",
			);
			// Claude Code waits up to 60 s for a session-start process the plugin left running.
			expect(Date.now() - started).toBeLessThan(20_000);
		},
		TIMEOUT,
	);
}

test(
	"SessionStart names the package manager to the model, and an unmatched glob reaches the command as written",
	async () => {
		const cwd = await folder("claude-session-bun");
		await Bun.write(join(cwd, "bun.lock"), "");

		const run = await claudeRun({
			cwd,
			script: [bash("echo zz-nomatch-*"), { text: "Done." }],
		});

		expect(BUN_CONTEXT).toContain("`bun`");
		expect(JSON.stringify(run.requests[0]?.["messages"])).toContain(
			BUN_CONTEXT,
		);
		expect(run.toolResults).toEqual(["zz-nomatch-*"]);
	},
	TIMEOUT,
);

test(
	"a branch move that changes a protected file is denied and leaves the tree",
	async () => {
		const cwd = await repo();
		const moves = [
			"git switch other",
			"git checkout other",
			"git rebase other",
			"git reset --hard other",
			"git -C . switch other",
			"git switch -c next other",
		];

		const run = await claudeRun({
			cwd,
			script: [...moves.map((m) => bash(m)), { text: "Done." }],
		});

		expect(run.toolResults).toHaveLength(moves.length);
		for (const result of run.toolResults) {
			expect(result).toContain(denyText([SKILL]));
		}
		expect(await Bun.file(join(cwd, SKILL)).text()).toBe("main");
	},
	TIMEOUT,
);

test(
	"a hard reset counts an uncommitted protected file, and a sandbox denyWrite path is protected too",
	async () => {
		const cwd = await repo();
		await mkdir(join(cwd, "secrets"));
		await Bun.write(join(cwd, "secrets/k"), "main");
		await Bun.write(
			join(cwd, ".claude/settings.local.json"),
			JSON.stringify({
				sandbox: { filesystem: { denyWrite: ["secrets/", "~/x"] } },
			}),
		);
		await Bun.write(join(cwd, ".claude/settings.json"), "{}");
		await git(cwd, "add", "-A");
		await git(cwd, "commit", "-q", "-m", "secrets");
		await git(cwd, "switch", "-q", "-c", "third");
		await Bun.write(join(cwd, "secrets/k"), "third");
		await git(cwd, "commit", "-q", "-am", "third");
		await git(cwd, "switch", "-q", "main");
		await Bun.write(join(cwd, ".claude/settings.json"), '{"a":1}');

		const run = await claudeRun({
			cwd,
			script: [
				bash("git reset --hard"),
				bash("git switch third"),
				{ text: "Done." },
			],
		});

		expect(run.toolResults[0]).toContain(".claude/settings.json");
		expect(run.toolResults[1]).toContain("secrets/k");
		expect(await Bun.file(join(cwd, ".claude/settings.json")).text()).toBe(
			'{"a":1}',
		);
	},
	TIMEOUT,
);

test(
	"a move with no protected change, and a command that moves no tree, run",
	async () => {
		const cwd = await repo();

		const run = await claudeRun({
			cwd,
			script: [
				bash("git status --short"),
				bash("git switch nowhere"),
				bash("git switch same"),
				{ text: "Done." },
			],
		});

		expect(run.toolResults.join("\n")).not.toContain("protected");
		const branch = await git(cwd, "branch", "--show-current");
		expect(branch.text().trim()).toBe("same");
	},
	TIMEOUT,
);

test(
	"a secret a command prints reaches the model redacted",
	async () => {
		const cwd = await folder("claude-session-secret");
		// Joined at run time, so this file holds no key a push scanner would flag.
		const key = [
			"sk-ant-",
			// betterleaks:allow
			"api03-",
			"tGSU8po_799NksnRH9ucAUsdMlHUvTCQCyEZDz-TddJ8HyS5SUkCnD8zRA9a9SkpXz9w3QlY7Zkuvqd",
		].join("");
		await Bun.write(join(cwd, "key.env"), `ANTHROPIC_API_KEY=${key}\n`);

		const run = await claudeRun({
			cwd,
			script: [bash("cat key.env"), { text: "Done." }],
		});

		expect(run.toolResults[0]).toContain("[REDACTED]");
		expect(JSON.stringify(run.requests)).not.toContain(key);
	},
	TIMEOUT,
);

test(
	"the Stop hook sends an unbulleted command back to the model",
	async () => {
		const run = await claudeRun({
			cwd: await folder("claude-session-stop"),
			script: [
				{ text: "Built.\n\n## What I Need From You\n\n! just deploy" },
				{ text: "Done." },
			],
		});

		const last = JSON.stringify(run.requests.at(-1)?.["messages"]);
		expect(last).toContain("`! just deploy` is no bullet.");
		expect(run.events.at(-1)?.["result"]).toBe("Done.");
	},
	TIMEOUT,
);

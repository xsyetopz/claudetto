import { afterEach, beforeEach, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
	at,
	denyText,
	movesOf,
} from "../../plugins/claudetto/scripts/protected-switch";

const SCRIPT = join(
	import.meta.dir,
	"../../plugins/claudetto/scripts/protected-switch.ts",
);
const SKILL = ".claude/skills/one/SKILL.md";

let dir = "";

const git = async (...argv: string[]) => {
	const run =
		await Bun.$`git -c user.name=t -c user.email=t@t -c commit.gpgsign=false ${argv}`
			.cwd(dir)
			.quiet();
	return run.exitCode;
};

// A repo whose `main` and `other` branches differ in a skill file, and in `src/a.ts`.
beforeEach(async () => {
	dir = await mkdtemp(join(tmpdir(), "protected-switch-"));
	await git("init", "-q", "-b", "main");
	await mkdir(join(dir, ".claude/skills/one"), { recursive: true });
	await mkdir(join(dir, "src"));
	await Bun.write(join(dir, SKILL), "main");
	await Bun.write(join(dir, "src/a.ts"), "main");
	await git("add", "-A");
	await git("commit", "-q", "-m", "main");
	await git("switch", "-q", "-c", "other");
	await Bun.write(join(dir, SKILL), "other");
	await Bun.write(join(dir, "src/a.ts"), "other");
	await git("commit", "-q", "-am", "other");
	await git("switch", "-q", "main");
});

afterEach(async () => {
	await rm(dir, { recursive: true, force: true });
});

const ranOn = async (command: string): Promise<string> => {
	const run = Bun.spawn(["bun", SCRIPT], {
		stdin: new Blob([JSON.stringify({ cwd: dir, tool_input: { command } })]),
		stdout: "pipe",
	});
	const out = await new Response(run.stdout).text();
	await run.exited;
	return out;
};

const reason = (out: string): string =>
	String(at(JSON.parse(out), "hookSpecificOutput", "permissionDecisionReason"));

for (const command of [
	"git switch other",
	"git checkout other",
	"git rebase other",
	"git reset --hard other",
	"git -C . switch other",
	"git switch -c next other",
]) {
	test(`${command} is denied, and the deny names the skill file`, async () => {
		expect(reason(await ranOn(command))).toBe(denyText([SKILL]));
	});
}

test("a switch to a branch with no protected change passes", async () => {
	await git("branch", "same");

	expect(await ranOn("git switch same")).toBe("");
});

test("a hard reset compares the working tree, so an uncommitted protected file counts", async () => {
	await Bun.write(join(dir, ".claude/settings.json"), "{}");
	await git("add", ".claude/settings.json");
	await git("commit", "-q", "-m", "settings");
	await Bun.write(join(dir, ".claude/settings.json"), '{"a":1}');

	expect(reason(await ranOn("git reset --hard"))).toContain(
		".claude/settings.json",
	);
});

test("a path the project settings' sandbox denyWrite names is compared too", async () => {
	await mkdir(join(dir, "secrets"));
	await Bun.write(join(dir, "secrets/k"), "main");
	await Bun.write(
		join(dir, ".claude/settings.local.json"),
		JSON.stringify({
			sandbox: { filesystem: { denyWrite: ["secrets/", "~/x"] } },
		}),
	);
	await git("add", "secrets");
	await git("commit", "-q", "-m", "secrets");
	await git("switch", "-q", "-c", "third");
	await Bun.write(join(dir, "secrets/k"), "third");
	await git("commit", "-q", "-am", "third");
	await git("switch", "-q", "main");

	expect(reason(await ranOn("git switch third"))).toContain("secrets/k");
});

for (const command of [
	"git checkout -- src/a.ts",
	"git rebase --continue",
	"git reset --soft HEAD~1",
	"git switch -c fresh",
	"git status",
	"ls",
	"",
]) {
	test(`"${command}" moves no tree, so it passes with no output`, async () => {
		expect(movesOf(command)).toEqual([]);
		expect(await ranOn(command)).toBe("");
	});
}

test("a ref git cannot resolve passes, and git reports it itself", async () => {
	expect(await ranOn("git switch nowhere")).toBe("");
});

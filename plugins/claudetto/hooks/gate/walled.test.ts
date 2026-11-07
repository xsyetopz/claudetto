import { expect, test } from "claude-code/testing";
import { namedPaths, spellsWall, unguarded, walledVerdict } from "./walled.ts";

const WALLS = ["~/.claudetto-holdout"];
const HOME = "/home/u";

const verdict = (tool: string, input: Record<string, string>) => {
	const named = namedPaths(tool, input);
	return spellsWall(WALLS, named)
		? walledVerdict(named, WALLS, HOME, "/p")
		: undefined;
};
const bash = (command: string) => verdict("Bash", { command });

test("a shell command that names a walled path in any spelling is denied", () => {
	for (const command of [
		"cd x; ls; head -c 1 ~/.claudetto-holdout/f",
		"cat a | grep x ~/.claudetto-holdout/f",
		'true && grep -c x "$HOME/.claudetto-holdout/f"',
		"head '/home/u/.claudetto-holdout/f'",
		"wc -l < ${HOME}/.claudetto-holdout/f",
		"cd ~ && cat .claudetto-holdout/f",
		"cd /tmp; cd ~/x/..; tail .claudetto-holdout/f",
		'bash -c "head ~/.claudetto-holdout/f"',
		"rg --file=~/.claudetto-holdout/f x",
		"ls ~/.claudetto-holdout",
		"cat ~/.claude/../.claudetto-holdout/f",
		"cat ~/.claudetto-hold\\out/f",
	]) {
		expect([command, bash(command)?.decision]).toEqual([command, "deny"]);
	}
});

test("a command that only mentions a walled path, or names a sibling, passes", () => {
	for (const command of [
		'grep -n "Read(~/.claudetto-holdout/**)" ~/.claude/settings.json',
		'git commit -m "wall off ~/.claudetto-holdout"',
		"cat ~/.claudetto-holdout-notes/f",
		"ls ~",
	]) {
		expect([command, bash(command)]).toEqual([command, undefined]);
	}
});

test("Read, Grep, and Glob under a wall are denied, and a search beside it passes", () => {
	expect(
		verdict("Read", { file_path: "/home/u/.claudetto-holdout/f" })?.decision,
	).toBe("deny");
	expect(
		verdict("Grep", { pattern: "x", path: "~/.claudetto-holdout" })?.decision,
	).toBe("deny");
	expect(verdict("Glob", { pattern: "~/.claudetto-holdout/*" })?.decision).toBe(
		"deny",
	);
	expect(
		verdict("Glob", { path: "/home/u", pattern: ".claudetto-holdout/*" })
			?.decision,
	).toBe("deny");
	expect(verdict("Glob", { path: "/home/u", pattern: "**/*.ts" })).toBe(
		undefined,
	);
});

test("the deny names the wall, says the user walled it off, and points at the user's ! command", () => {
	expect(bash("head -c 1 ~/.claudetto-holdout/canary.txt")?.reason).toBe(
		"~/.claudetto-holdout/canary.txt is under `~/.claudetto-holdout`, which the user walled off. Do not read, list, or search it by any tool, command, or other route. If a count or a fact about it is needed, ask the user to run their own `! <command>` and tell you the result.",
	);
});

test("a wall is guarded by its Read deny in the ~/ or // form, and by nothing else", () => {
	const guard = (deny: unknown) => unguarded(WALLS, { deny }, HOME);
	expect(guard(["Read(~/.claudetto-holdout/**)"])).toEqual([]);
	expect(guard(["Read(//home/u/.claudetto-holdout/**)"])).toEqual([]);
	expect(guard(["Read(~/.claudetto-holdout)"])).toEqual(WALLS);
	expect(guard(["Bash(rm:*)"])).toEqual(WALLS);
	expect(unguarded(WALLS, undefined, HOME)).toEqual(WALLS);
});

// The `git` findings of the gate: the bulk stage and the whole-tree verbs over user edits, the local loss, and the shared tree of a subagent (X2, X4).

import { expect, test } from "bun:test";
import { gate } from "../../../plugins/claudetto/modules/gate/domain/gate.ts";
import { bash, facts, unreadOf, verdictsOf } from "./facts-stub.ts";

const BULK = [
	"git add -A",
	"git add --all",
	"git add .",
	"git -C /p add -A",
	"git commit -a -m x",
	"git commit -am x",
	"git commit --all -m x",
	"cd /p && git add . && git commit -m x",
];

// "Bulk Stage over User Edits" (X2): the ledger decides, and a person approves only a change of the user.
test("User Edit in the Tree: a bulk stage asks, and the dialog names the file", async () => {
	const f = facts();
	f.users.push(".github/workflows/commitlint.yml");
	const verdicts = await verdictsOf(BULK, f);
	for (const [command, v] of verdicts) {
		expect([command, v.decision]).toStrictEqual([command, "ask"]);
		expect(v.reason).toContain("`.github/workflows/commitlint.yml`");
	}
});

test("Only Agent Edits: a bulk stage runs with no prompt", async () => {
	const f = facts();
	const verdicts = await verdictsOf(BULK, f);
	for (const [command, v] of verdicts) {
		expect([command, v.decision]).toStrictEqual([command, "allow"]);
	}
	expect(f.runs.every((r) => r[0] === "userEdits")).toBe(true);
});

test("Bulk Stage: the check reads the work tree of the `-C` folder, and a named stage reads no ledger", async () => {
	const f = facts();
	f.users.push("a.ts");
	await bash("git -C /other add -A", f);
	expect(f.runs).toStrictEqual([["userEdits", "/other"]]);
	f.runs.length = 0;
	const unread = await unreadOf(
		[
			"git add src/a.ts",
			"git add -- a.ts b.ts",
			'git commit -m "fix a"',
			"git commit -m x",
			"git commit --amend --no-edit",
			"git commit -ma",
			"git status",
		],
		f,
	);
	expect(unread).toStrictEqual({ refused: [], runs: [] });
});

test("Bulk Stage: a deny of another gate stays, with no ledger read", async () => {
	const f = facts();
	f.users.push("a.ts");
	const v = await bash("git add -A .env", f);
	expect(v.decision).toBe("deny");
	expect(f.runs).toStrictEqual([]);
});

const WHOLE_TREE = [
	"git stash",
	"git stash push",
	"git stash save wip",
	"git stash -u",
	"git stash push -k -m wip",
	"git stash apply",
	"git stash pop",
	"git stash pop stash@{1}",
	"git reset",
	"git reset HEAD",
	"git reset --mixed",
	"git reset --soft HEAD~1",
	"git -C /p stash",
	"git reset a.ts",
];
const KEPT = [
	"git stash list",
	"git stash show",
	"git stash apply --index",
	"git stash pop --index",
	"git reset -- a.ts",
	"git reset HEAD a.ts",
	"git stash push -- a.ts",
	"git stash push -m wip a.ts",
];

test("Whole-Tree Verb: with a change of the user, each form asks, and the dialog names the file", async () => {
	const f = facts();
	f.users.push("a.ts");
	const verdicts = await verdictsOf(WHOLE_TREE, f);
	for (const [command, v] of verdicts) {
		expect([command, v.decision]).toStrictEqual([command, "ask"]);
		expect(v.reason).toContain("`a.ts`");
	}
});

test("Whole-Tree Verb: with only changes of the agent, each form runs with no prompt", async () => {
	const f = facts();
	const verdicts = await verdictsOf(WHOLE_TREE, f);
	for (const [command, v] of verdicts) {
		expect([command, v.decision]).toStrictEqual([command, "allow"]);
	}
});

test("Whole-Tree Verb: a form with a path, a list, or `--index` reads no ledger and runs", async () => {
	const f = facts();
	f.users.push("a.ts");
	expect(await unreadOf(KEPT, f)).toStrictEqual({ refused: [], runs: [] });
});

test("Reset on a Clean Tree runs, and `reset --hard` with changes asks", async () => {
	expect((await bash("git reset --hard HEAD~1")).decision).toBe("allow");
	expect((await bash("git reset --hard", facts("/p"))).decision).toBe("ask");
});

test("Local Git Loss: `checkout --`, `restore`, and `clean -f` ask only when the paths can lose work", async () => {
	const f = facts("a.ts");
	expect((await bash("git checkout -- src/a.ts", f)).decision).toBe("ask");
	expect((await bash("git restore src/a.ts", f)).decision).toBe("ask");
	expect((await bash("git checkout -- src/b.ts", f)).decision).toBe("allow");
	expect((await bash("git clean -fd", facts("/p"))).decision).toBe("ask");
	expect(f.runs[0]).toStrictEqual(["changes", "/p", "src/a.ts"]);
});

test("a `git -C` and a `cd` move the folder of the `git` check", async () => {
	const f = facts();
	await bash("cd sub && git -C inner reset --hard", f);
	expect(f.runs).toStrictEqual([["changes", "/p/sub/inner"]]);
});

// "Shared Tree in Subagents" (X4, task 10.2 of change `release-0-3-0-alpha-2`).
const fromAgent = (command: string, agentId?: string) =>
	gate({ tool: "Bash", input: { command }, agentId }, facts());
const fromAgentAll = (commands: readonly string[], agentId?: string) =>
	Promise.all(
		commands.map(async (c) => [c, await fromAgent(c, agentId)] as const),
	);

test("Subagent Stash: `git stash` and `pkill -f` from a subagent ask", async () => {
	const verdicts = await fromAgentAll(
		["git stash", "git stash push -m x", "pkill -f vite", "pkill --full bun"],
		"sub1",
	);
	for (const [c, v] of verdicts) {
		expect([c, v.decision]).toStrictEqual([c, "ask"]);
	}
});

test("Main Stash: the main agent runs `git stash` and `pkill -f` with no prompt, and a subagent runs `git stash list` and `pkill node`", async () => {
	const main = await fromAgentAll(["git stash", "pkill -f vite"]);
	for (const [c, v] of main) {
		expect([c, v.decision]).toStrictEqual([c, "allow"]);
	}
	const sub = await fromAgentAll(
		["git stash list", "git stash show -p", "pkill node"],
		"sub1",
	);
	for (const [c, v] of sub) {
		expect([c, v.decision]).toStrictEqual([c, "allow"]);
	}
});

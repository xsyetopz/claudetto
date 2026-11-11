import { gateRmTmp, gateWorktreeRemove } from "../texts-gate.ts";
import { allowed, asks, denied } from "./processes.mock.ts";

// A temp base holds every session's files: the base, all of its entries, and a path that leaves it through `..` stay.
denied("rm -rf /tmp", gateRmTmp("/tmp"));
denied("rm -rf /private/tmp/claude-501", gateRmTmp("/private/tmp/claude-501"));
denied("rm -rf /tmp/claude-501/", gateRmTmp("/tmp/claude-501/"));
denied("rm -rf /tmp/claude-501/*", gateRmTmp("/tmp/claude-501/*"));
denied("rm -rf /tmp/claude-*", gateRmTmp("/tmp/claude-*"));
denied('rm -rf "$TMPDIR"', gateRmTmp("$TMPDIR"));
denied("rm -rf /tmp/mine/../other", gateRmTmp("/tmp/mine/../other"));
denied("rm -rf /tmp/mine /tmp", gateRmTmp("/tmp"));
// Seen in 58 sampled denials: each was the session's own scratch file or folder.
allowed("rm -rf /tmp/other/x");
allowed("rm -f /private/tmp/other");
allowed("rm -rf /tmp/claude-501/gate20");
allowed('rm -rf "$TMPDIR/x"');
allowed("rm /tmp/el.log");
allowed("rm notes.txt");

denied("git worktree remove /w/old", gateWorktreeRemove("/w/old"));
denied("git worktree remove /w/old", gateWorktreeRemove("/w/old"), [
	{ command: "git worktree add /w/old", text: "", isError: true },
]);
allowed("git worktree remove /w/new", [
	{ command: "git worktree add -b feat /w/new", text: "" },
]);
// ISSUES 2026-11-09 item 20: the add named its path through a variable set earlier in the same call.
allowed("git worktree remove --force $TMPDIR/m", [
	{ command: "M=$TMPDIR/m && git worktree add -q -b x $M main", text: "" },
]);
allowed("git worktree remove /w/v", [
	{ command: ['D="/w/v"; git worktree add "$', '{D}"'].join(""), text: "" },
]);
denied("git worktree remove $TMPDIR/n", gateWorktreeRemove("$TMPDIR/n"), [
	{ command: "M=$TMPDIR/m && git worktree add $M", text: "" },
]);
allowed("git worktree remove --force /w/ent", [
	{ tool: "EnterWorktree", text: "Created worktree at /w/ent", command: "" },
]);
const WORKER = {
	tool: "Agent",
	text: "Async agent launched successfully.\nagentId: a1b2c3 (internal ID)",
	command: "",
};
allowed("git worktree remove --force .claude/worktrees/agent-a1b2c3", [WORKER]);
denied(
	"git worktree remove .claude/worktrees/agent-zz9",
	gateWorktreeRemove(".claude/worktrees/agent-zz9"),
	[WORKER],
);
asks("git branch -D worktree-agent-zz9", [WORKER]);
allowed("git branch -D worktree-agent-a1b2c3", [WORKER]);

asks("git branch -D theirs");
asks("git branch -d --force theirs", [
	{ command: "git branch theirs", text: "", isError: true },
]);

// Owned passes with no prompt; unowned twins and mixed targets keep their verdicts.
allowed("git worktree remove --force /w/new", [
	{ command: "git worktree add /w/new", text: "" },
]);
denied("git worktree remove --force /w/old", gateWorktreeRemove("/w/old"));
allowed("kill -9 4242", [{ command: "sleep 60 & echo $!", text: "4242" }]);
asks("git branch -D mine theirs", [{ command: "git branch mine", text: "" }]);

const MINE = [{ command: "git branch mine", text: "" }];

allowed("git update-ref -d refs/heads/mine", MINE);
asks("git update-ref -d refs/heads/main", MINE);
asks("git update-ref -d refs/heads/main");
allowed("git branch -f mine abc1234", MINE);
asks("git branch -f main abc1234", MINE);
asks("git branch -f -M mine main", MINE);
allowed("git update-ref refs/heads/mine abc1234", MINE);
asks("git update-ref refs/heads/main abc1234", MINE);
asks("git update-ref -d refs/tags/mine", MINE);
asks(
	"git update-ref -d refs/heads/mine && git update-ref -d refs/heads/main",
	MINE,
);
asks("git reset --soft abc1234", MINE);

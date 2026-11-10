import { gateRmTmp, gateTmpMarker, gateWorktreeRemove } from "../texts-gate.ts";
import { allowed, asks, denied, MARK } from "./processes.mock.ts";

denied("rm -rf /tmp/other/x", gateRmTmp("/tmp/other/x"));
denied("rm -f /private/tmp/other", gateRmTmp("/private/tmp/other"));
denied("rm -rf /tmp", gateRmTmp("/tmp"));
denied("rm -rf /tmp/mine", gateRmTmp("/tmp/mine"), [], { [MARK]: "S2" });
denied("rm -rf /tmp/mine/../other", gateRmTmp("/tmp/mine/../other"), [], {
	[MARK]: "S1",
});
allowed("rm /tmp/mine/sub", [], { [MARK]: "S1\n" });
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
allowed("rm -rf /tmp/mine", [], { [MARK]: "S1" });
// The sandbox's TMPDIR, `/tmp/claude-<uid>`, is a base like `/tmp`: each folder in it is a top with its own marker.
allowed("rm -rf /tmp/claude-501/gate20", [], {
	"/tmp/claude-501/gate20/.created-by-claudetto": "S1",
});
denied("rm -rf /tmp/claude-501/other", gateRmTmp("/tmp/claude-501/other"));
denied("rm -rf /tmp/claude-501", gateRmTmp("/tmp/claude-501"));
allowed("git worktree remove --force /w/new", [
	{ command: "git worktree add /w/new", text: "" },
]);
denied("git worktree remove --force /w/old", gateWorktreeRemove("/w/old"));
allowed("kill -9 4242", [{ command: "sleep 60 & echo $!", text: "4242" }]);
denied("rm -rf /tmp/mine /tmp/other", gateRmTmp("/tmp/other"), [], {
	[MARK]: "S1",
});
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

// 18.41: a /tmp folder gets its marker in the command that makes it.
denied("mkdir -p /tmp/probe-x/sub", gateTmpMarker("/tmp/probe-x/sub"));
denied("mktemp -d /tmp/probe-XXXX", gateTmpMarker("/tmp/probe-XXXX"));
denied("cd /p && mkdir /private/tmp/y", gateTmpMarker("/private/tmp/y"));
// Seen live: a folder made through a variable got no marker and outlived the session.
denied(
	"S=/tmp/claude-501/gate20 && mkdir -p $S",
	gateTmpMarker("/tmp/claude-501/gate20"),
);
allowed(
	"mkdir -p /tmp/probe-x && printenv CLAUDE_CODE_SESSION_ID > /tmp/probe-x/.created-by-claudetto",
);
allowed(
	'd=$(mktemp -d /tmp/probe-XXXX) && printenv CLAUDE_CODE_SESSION_ID > "$d/.created-by-claudetto"',
);
allowed("mkdir -p /tmp/mine/sub", [], { [MARK]: "S1" });
// A folder that is there already, made by another session or the user, gets no new folder from a mkdir under it.
allowed("mkdir -p /tmp/mine/sub", [], { [MARK]: "S2" });
allowed("mkdir -p /tmp/proj/build", [], { "/tmp/proj/README.md": "x" });
allowed("mkdir -p build/out");
// A relative path after `cd` or `pushd` makes a folder in the folder it moved to.
denied("cd /tmp && mkdir probe-r", gateTmpMarker("/tmp/probe-r"));
denied("pushd /private/tmp; mkdir -p a/b", gateTmpMarker("/private/tmp/a/b"));
allowed(
	"cd /tmp && mkdir probe-r && printenv CLAUDE_CODE_SESSION_ID > probe-r/.created-by-claudetto",
);
allowed("cd /tmp/mine && mkdir sub", [], { [MARK]: "S2" });
allowed("cd build && mkdir out");
// A path ends at a shell operator, so the folder checked is the one the command names.
allowed("mkdir /tmp/mine;ls", [], { [MARK]: "S2" });
allowed("mktemp -d");

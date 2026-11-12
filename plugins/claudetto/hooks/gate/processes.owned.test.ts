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
denied("git worktree remove $TMPDIR/n", gateWorktreeRemove("$TMPDIR/n"), [
	{ command: "M=$TMPDIR/m && git worktree add $M", text: "" },
]);

asks("git branch -D theirs");
asks("git branch -d --force theirs", [
	{ command: "git branch theirs", text: "", isError: true },
]);

// Unowned twins and mixed targets keep their verdicts.
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

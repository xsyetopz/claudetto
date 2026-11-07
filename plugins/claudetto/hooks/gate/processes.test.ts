import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";
import { scanner } from "../secrets.mock.ts";
import {
	GATE_KILL_BROAD,
	GATE_RELEASE_RUN,
	gateBranchDelete,
	gateKillPid,
	gateRmTmp,
	gateTmpMarker,
	gateWorktreeRemove,
} from "../texts.ts";

const RELEASE = "/Users/u/.local/share/claude/versions/2.1.319";

interface Earlier {
	command?: string;
	text: string;
	tool?: string;
	isError?: true;
}

// `marked` maps a path to the content of the file there.
const lab = (
	on: On,
	past: Earlier[] = [],
	marked: Record<string, string> = {},
) => {
	scanner(on);
	on("session.cwd", () => ({ value: "/p" }));
	on("session.id", () => ({ value: "S1" }));
	on("fs.exists", (_$, e) => ({ value: e.path in marked }));
	on("fs.read", (_$, e) => ({ value: marked[e.path] ?? "" }));
	on("session.messages", () => ({
		value: [
			{
				role: "assistant",
				text: "",
				toolUses: past.map((p, i) => ({
					tool: p.tool ?? "Bash",
					tool_use_id: `${i}`,
					input: { command: p.command },
					text: p.text,
					...(p.isError && { isError: true }),
				})),
			},
		],
	}));
	on("tool.check", () => ({ decision: "allow" }));
};
const run = ($: Engine, command: string) =>
	$.tool.check({ tool: "Bash", input: { command } });

for (const command of [
	"pkill -f probe",
	"sudo killall node",
	"sh -c 'pkill x'",
]) {
	test(`${command} is denied with the plain text`, async ($: Engine, on: On) => {
		lab(on);
		const v = await run($, command);
		expect(v.decision).toBe("deny");
		expect(v.reason).toContain(GATE_KILL_BROAD);
	});
}

test("kill of a pid no result shows is denied", async ($: Engine, on: On) => {
	lab(on);
	const v = await run($, "kill -9 4242");
	expect(v.decision).toBe("deny");
	expect(v.reason).toContain(gateKillPid("4242"));
});

test("kill of a pid a background command printed passes", async ($: Engine, on: On) => {
	lab(on, [{ command: "sleep 60 & echo $!", text: "4242" }]);
	expect((await run($, "kill 4242")).decision).toBe("allow");
});

test("a pid printed by a command that was not backgrounded is denied", async ($: Engine, on: On) => {
	lab(on, [{ command: "pgrep node", text: "4242" }]);
	expect((await run($, "kill 4242")).decision).toBe("deny");
});

for (const command of [
	"kill -0 4242",
	"kill -l",
	"kill %1",
	"sleep 9 & kill $!",
]) {
	test(`${command} passes`, async ($: Engine, on: On) => {
		lab(on);
		expect((await run($, command)).decision).toBe("allow");
	});
}

for (const command of [
	`${RELEASE} --help`,
	`${RELEASE} plugin test --help`,
	"sudo /opt/claude/versions/2.1.318 mcp --help",
]) {
	test(`${command} is denied and points at cc-inspect`, async ($: Engine, on: On) => {
		lab(on);
		const v = await run($, command);
		expect(v.decision).toBe("deny");
		expect(v.reason).toContain(GATE_RELEASE_RUN);
	});
}

for (const command of [
	"claude --help",
	"claude plugin test --help",
	`ls ${RELEASE}`,
]) {
	test(`${command} passes`, async ($: Engine, on: On) => {
		lab(on);
		expect((await run($, command)).decision).toBe("allow");
	});
}

const MARK = "/tmp/mine/.created-by-claudetto";
const denied = (
	command: string,
	reason: string,
	past: Earlier[] = [],
	marked: Record<string, string> = {},
) =>
	test(`${command} is denied as not owned`, async ($: Engine, on: On) => {
		lab(on, past, marked);
		const v = await run($, command);
		expect(v.decision).toBe("deny");
		expect(v.reason).toContain(reason);
	});
const allowed = (
	command: string,
	past: Earlier[] = [],
	marked: Record<string, string> = {},
) =>
	test(`${command} passes as owned`, async ($: Engine, on: On) => {
		lab(on, past, marked);
		expect((await run($, command)).decision).toBe("allow");
	});

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
denied(
	"git branch -D worktree-agent-zz9",
	gateBranchDelete("worktree-agent-zz9"),
	[WORKER],
);
allowed("git branch -D worktree-agent-a1b2c3", [WORKER]);

denied("git branch -D theirs", gateBranchDelete("theirs"));
denied("git branch -d --force theirs", gateBranchDelete("theirs"), [
	{ command: "git branch theirs", text: "", isError: true },
]);
for (const make of [
	"git branch mine",
	"git checkout -b mine",
	"git switch -c mine",
	"git worktree add -b mine /w/m",
]) {
	test(`git branch -D of a branch made by ${make} passes`, async ($: Engine, on: On) => {
		lab(on, [{ command: make, text: "" }]);
		expect((await run($, "git branch -D mine")).decision).toBe("allow");
	});
}

// Owned passes with no prompt; unowned twins and mixed targets keep their verdicts.
allowed("rm -rf /tmp/mine", [], { [MARK]: "S1" });
allowed("git worktree remove --force /w/new", [
	{ command: "git worktree add /w/new", text: "" },
]);
denied("git worktree remove --force /w/old", gateWorktreeRemove("/w/old"));
allowed("kill -9 4242", [{ command: "sleep 60 & echo $!", text: "4242" }]);
denied("rm -rf /tmp/mine /tmp/other", gateRmTmp("/tmp/other"), [], {
	[MARK]: "S1",
});
denied("git branch -D mine theirs", gateBranchDelete("theirs"), [
	{ command: "git branch mine", text: "" },
]);

const asks = (command: string, past: Earlier[] = []) =>
	test(`${command} keeps asking as not owned`, async ($: Engine, on: On) => {
		lab(on, past);
		expect((await run($, command)).decision).toBe("ask");
	});
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
allowed(
	'mkdir -p /tmp/probe-x && printenv CLAUDE_CODE_SESSION_ID > /tmp/probe-x/.created-by-claudetto',
);
allowed(
	'd=$(mktemp -d /tmp/probe-XXXX) && printenv CLAUDE_CODE_SESSION_ID > "$d/.created-by-claudetto"',
);
allowed("mkdir -p /tmp/mine/sub", [], { [MARK]: "S1" });
denied("mkdir -p /tmp/mine/sub", gateTmpMarker("/tmp/mine/sub"), [], {
	[MARK]: "S2",
});
allowed("mkdir -p build/out");
allowed("mktemp -d");

// Seen live: a worker denied a bare `mkdir` made its /tmp folder with Write, which makes missing folders.
const write = ($: Engine, file_path: string) =>
	$.tool.check({ tool: "Write", input: { file_path, content: "x" } });
test("a Write under an unmarked /tmp folder is denied with the marker line", async ($: Engine, on: On) => {
	lab(on, [], { [MARK]: "S2" });
	for (const path of ["/tmp/live-1/notes.txt", "/tmp/mine/notes.txt"]) {
		const v = await write($, path);
		expect(v.decision).toBe("deny");
		expect(v.reason).toContain(gateTmpMarker(path.slice(0, path.lastIndexOf("/"))));
	}
});
test("a Write under this session's marked /tmp folder or outside /tmp passes", async ($: Engine, on: On) => {
	lab(on, [], { [MARK]: "S1" });
	expect((await write($, "/tmp/mine/notes.txt")).decision).toBe("allow");
	expect((await write($, "/p/tmp/x/notes.txt")).decision).toBe("allow");
	expect((await write($, "/tmp/notes.txt")).decision).toBe("allow");
});

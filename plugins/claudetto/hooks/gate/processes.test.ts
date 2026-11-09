import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";
import { scanner } from "../secrets.mock.ts";
import {
	GATE_KILL_BROAD,
	GATE_RELEASE_RUN,
	GATE_ENDLESS_WAIT,
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
	said: string[] = [],
) => {
	scanner(on);
	on("session.cwd", () => ({ value: "/p" }));
	on("session.id", () => ({ value: "S1" }));
	on("fs.exists", (_$, e) => ({
		value: Object.keys(marked).some((k) => k === e.path || k.startsWith(`${e.path}/`)),
	}));
	on("fs.read", (_$, e) => ({ value: marked[e.path] ?? "" }));
	on("session.messages", () => ({
		value: [
			...said.map((text) => ({ role: "user" as const, text, toolUses: [] })),
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

const asks = (command: string, past: Earlier[] = []) =>
	test(`${command} keeps asking as not owned`, async ($: Engine, on: On) => {
		lab(on, past);
		expect((await run($, command)).decision).toBe("ask");
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
asks("git branch -D worktree-agent-zz9", [WORKER]);
allowed("git branch -D worktree-agent-a1b2c3", [WORKER]);

asks("git branch -D theirs");
asks("git branch -d --force theirs", [
	{ command: "git branch theirs", text: "", isError: true },
]);

for (const said of [
	"delete all other local branches",
	"Remove the branch old-feature, it is merged.",
]) {
	test(`The Person Asked: after "${said}", git branch -D old-feature runs`, async ($: Engine, on: On) => {
		lab(on, [], {}, [said]);
		expect((await run($, "git branch -D old-feature")).decision).toBe("allow");
	});
}

for (const said of ["Do not delete branch old-feature.", "old-feature is out."]) {
	test(`No Request: after "${said}", git branch -D old-feature asks`, async ($: Engine, on: On) => {
		lab(on, [], {}, [said]);
		expect((await run($, "git branch -D old-feature")).decision).toBe("ask");
	});
}
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
allowed(
	'mkdir -p /tmp/probe-x && printenv CLAUDE_CODE_SESSION_ID > /tmp/probe-x/.created-by-claudetto',
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

// Seen live: a worker denied a bare `mkdir` made its /tmp folder with Write, which makes missing folders.
const write = ($: Engine, file_path: string) =>
	$.tool.check({ tool: "Write", input: { file_path, content: "x" } });
test("a Write that would make a /tmp folder is denied with the marker line", async ($: Engine, on: On) => {
	lab(on);
	const v = await write($, "/tmp/live-1/notes.txt");
	expect(v.decision).toBe("deny");
	expect(v.reason).toContain(gateTmpMarker("/tmp/live-1"));
});
// Seen live: a session's repo sat in a /tmp folder another session marked.
test("a Write under a /tmp folder that is there already, or outside /tmp, passes", async ($: Engine, on: On) => {
	lab(on, [], { [MARK]: "S2" });
	expect((await write($, "/tmp/mine/notes.txt")).decision).toBe("allow");
	expect((await write($, "/p/tmp/x/notes.txt")).decision).toBe("allow");
	expect((await write($, "/tmp/notes.txt")).decision).toBe("allow");
});

// Seen in another session: a background wait for four successes polled for 32 minutes after one job failed.
const WAIT = "until [ $(gh run list --json conclusion | grep -c success) -ge 4 ]; do sleep 30; done";
const background = ($: Engine, command: string) =>
	$.tool.check({ tool: "Bash", input: { command, run_in_background: true } });
test("a background wait loop with no time limit is denied", async ($: Engine, on: On) => {
	lab(on);
	const v = await background($, WAIT);
	expect(v.decision).toBe("deny");
	expect(v.reason).toContain(GATE_ENDLESS_WAIT);
});
for (const command of [
	`timeout 1800 sh -c '${WAIT}'`,
	"until gh run view 1 --exit-status || [ $SECONDS -gt 1800 ]; do sleep 30; done",
	"for i in $(seq 60); do gh run view 1 && break; sleep 30; done",
	"bun run dev",
]) {
	test(`a background ${command} is not denied as an endless wait`, async ($: Engine, on: On) => {
		lab(on);
		expect((await background($, command)).decision).not.toBe("deny");
	});
}
test("the same wait loop in the foreground is not denied, since the Bash timeout ends it", async ($: Engine, on: On) => {
	lab(on);
	expect((await run($, WAIT)).decision).not.toBe("deny");
});

import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";
import { scanner } from "../secrets.mock.ts";
import {
	GATE_KILL_BROAD,
	GATE_RELEASE_RUN,
	gateBranchDelete,
	gateKillPid,
	gateRmTmp,
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
test("git branch -D of a worker's branch is not denied as foreign", async ($: Engine, on: On) => {
	lab(on, [WORKER]);
	const v = await run($, "git branch -D worktree-agent-a1b2c3");
	expect(v.decision).toBe("ask");
});

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
	test(`git branch -D of a branch made by ${make} is not denied as foreign`, async ($: Engine, on: On) => {
		lab(on, [{ command: make, text: "" }]);
		const v = await run($, "git branch -D mine");
		// The engine rule still asks; only the owner deny is gone.
		expect(v.decision).toBe("ask");
	});
}

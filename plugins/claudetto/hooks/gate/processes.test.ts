import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

import { bash } from "../secrets.mock.ts";
import {
	GATE_ENDLESS_WAIT,
	GATE_KILL_BROAD,
	GATE_RELEASE_RUN,
	gateKillPid,
} from "../texts-gate.ts";
import { lab } from "./processes.mock.ts";

const RELEASE = "/Users/u/.local/share/claude/versions/2.1.319";

for (const command of [
	"pkill -f probe",
	"sudo killall node",
	"sh -c 'pkill x'",
]) {
	test(`${command} is denied with the plain text`, async ($: Engine, on: On) => {
		lab(on);
		const v = await bash($, command);
		expect(v.decision).toBe("deny");
		expect(v.reason).toContain(GATE_KILL_BROAD);
	});
}

test("kill of a pid no result shows is denied", async ($: Engine, on: On) => {
	lab(on);
	const v = await bash($, "kill -9 4242");
	expect(v.decision).toBe("deny");
	expect(v.reason).toContain(gateKillPid("4242"));
});

test("kill of a pid a background command printed passes", async ($: Engine, on: On) => {
	lab(on, [{ command: "sleep 60 & echo $!", text: "4242" }]);
	const awaited = await bash($, "kill 4242");
	expect(awaited.decision).toBe("allow");
});

test("a pid printed by a command that was not backgrounded is denied", async ($: Engine, on: On) => {
	lab(on, [{ command: "pgrep node", text: "4242" }]);
	const awaited2 = await bash($, "kill 4242");
	expect(awaited2.decision).toBe("deny");
});

for (const command of [
	"kill -0 4242",
	"kill -l",
	"kill %1",
	"sleep 9 & kill $!",
	"claude --help",
	"claude plugin test --help",
	`ls ${RELEASE}`,
]) {
	test(`${command} passes`, async ($: Engine, on: On) => {
		lab(on);
		const awaited3 = await bash($, command);
		expect(awaited3.decision).toBe("allow");
	});
}

for (const command of [
	`${RELEASE} --help`,
	`${RELEASE} plugin test --help`,
	"sudo /opt/claude/versions/2.1.318 mcp --help",
]) {
	test(`${command} is denied and points at cc-inspect`, async ($: Engine, on: On) => {
		lab(on);
		const v = await bash($, command);
		expect(v.decision).toBe("deny");
		expect(v.reason).toContain(GATE_RELEASE_RUN);
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
		const awaited8 = await bash($, "git branch -D mine");
		expect(awaited8.decision).toBe("allow");
	});
}

// Seen in another session: a background wait for four successes polled for 32 minutes after one job failed.
const WAIT =
	"until [ $(gh run list --json conclusion | grep -c success) -ge 4 ]; do sleep 30; done";
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
		const awaited12 = await background($, command);
		expect(awaited12.decision).not.toBe("deny");
	});
}
test("the same wait loop in the foreground is not denied, since the Bash timeout ends it", async ($: Engine, on: On) => {
	lab(on);
	const awaited13 = await bash($, WAIT);
	expect(awaited13.decision).not.toBe("deny");
});

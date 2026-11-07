import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";
import { scanner } from "../secrets.mock.ts";
import { GATE_KILL_BROAD, GATE_RELEASE_RUN, gateKillPid } from "../texts.ts";

const RELEASE = "/Users/u/.local/share/claude/versions/2.1.319";

const lab = (on: On, past: { command: string; text: string }[] = []) => {
	scanner(on);
	on("session.cwd", () => ({ value: "/p" }));
	on("fs.exists", () => ({ value: false }));
	on("session.messages", () => ({
		value: [
			{
				role: "assistant",
				text: "",
				toolUses: past.map((p, i) => ({
					tool: "Bash",
					tool_use_id: `${i}`,
					input: { command: p.command },
					text: p.text,
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

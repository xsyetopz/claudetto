import type { On } from "claude-code";
import { describe, expect, test } from "claude-code/testing";

/** Answers each git call from a table keyed by its arguments; an absent key exits 128. */
const world = (on: On, answers: Record<string, string>) => {
	const ran: string[] = [];
	on("classic.PostToolUse", () => ({}));
	on("classic.PostToolUseFailure", () => ({}));
	on("ui.log", () => ({ value: undefined }));
	on("process.run", (_$, e) => {
		const key = e.argv.slice(1).join(" ");
		ran.push(key);
		const out = answers[key];
		return {
			value: {
				exitCode: out === undefined ? 128 : 0,
				stdout: out ?? "",
				stderr: "",
				isStdoutTruncated: false,
				isStderrTruncated: false
			}
		};
	});
	return ran;
};

const TRACKED = {
	"rev-parse --short=9 HEAD": "6f81c479a\n",
	"symbolic-ref --short -q HEAD": "main\n",
	"rev-parse --abbrev-ref @{upstream}": "origin/main\n",
	"rev-list --left-right --count @{upstream}...HEAD": "212\t0\n"
};

const bash = (command: string, response: unknown) => ({
	tool_name: "Bash",
	tool_input: { command },
	tool_response: response,
	tool_use_id: "u1"
});

describe("switch context (REQ-GUARDS-080, issue #95)", () => {
	test("git checkout names HEAD and its distance from the upstream", async ($, on) => {
		world(on, TRACKED);
		const r = await $.classic.PostToolUse(
			bash("git checkout main", { stdout: "Switched", stderr: "" })
		);
		expect(r.additionalContext).toEqual([
			"HEAD 6f81c479a on main, 212 behind origin/main"
		]);
	});
	test("git switch counts ahead and behind", async ($, on) => {
		world(on, {
			...TRACKED,
			"rev-list --left-right --count @{upstream}...HEAD": "2\t3\n"
		});
		const r = await $.classic.PostToolUse(bash("git switch main", {}));
		expect(r.additionalContext).toEqual([
			"HEAD 6f81c479a on main, 3 ahead, 2 behind origin/main"
		]);
	});
	test("a branch with no upstream gets the commit alone", async ($, on) => {
		world(on, {
			"rev-parse --short=9 HEAD": "abc123def",
			"symbolic-ref --short -q HEAD": "topic"
		});
		const r = await $.classic.PostToolUse(bash("git checkout topic", {}));
		expect(r.additionalContext).toEqual(["HEAD abc123def on topic"]);
	});
	test("a detached HEAD says so", async ($, on) => {
		world(on, { "rev-parse --short=9 HEAD": "abc123def" });
		const r = await $.classic.PostToolUse(bash("git checkout abc123d", {}));
		expect(r.additionalContext).toEqual(["HEAD abc123def detached"]);
	});
	test("unable to unlink adds the partial-switch note and git status", async ($, on) => {
		world(on, TRACKED);
		const r = await $.classic.PostToolUse(
			bash("git checkout main", {
				stdout: "",
				stderr: "warning: unable to unlink 'a/b': Permission denied"
			})
		);
		const text = r.additionalContext?.[0] ?? "";
		expect(text).toContain("HEAD 6f81c479a on main, 212 behind origin/main");
		expect(text).toContain("partial");
		expect(text).toContain("half-switched");
		expect(text).toContain("git status");
	});
	test("a switch that failed partway still gets HEAD and the partial-switch note", async ($, on) => {
		world(on, TRACKED);
		const r = await $.classic.PostToolUseFailure({
			tool_name: "Bash",
			tool_input: { command: "git checkout main" },
			tool_use_id: "u2",
			error: "Exit code 1\nerror: unable to unlink old 'a/b': Permission denied"
		});
		const text = r.additionalContext?.[0] ?? "";
		expect(text).toContain("HEAD 6f81c479a on main, 212 behind origin/main");
		expect(text).toContain("half-switched");
		expect(text).toContain("git status");
	});
	test("a command that is no switch runs no git", async ($, on) => {
		const ran = world(on, TRACKED);
		const r = await $.classic.PostToolUse(bash("git status", {}));
		expect(r.additionalContext).toBeUndefined();
		expect(ran).toEqual([]);
	});
});

describe("pipe context (REQ-GUARDS-081, issue #99)", () => {
	test("an error: line behind a filter is named with the last-stage note", async ($, on) => {
		world(on, {});
		const r = await $.classic.PostToolUse(
			bash("make 2>&1 | tail -5", { stdout: "ok\nerror: linker failed\n" })
		);
		const text = r.additionalContext?.[0] ?? "";
		expect(text).toContain("error: linker failed");
		expect(text).toContain("last pipe stage's");
	});
	test("a fatal: line on stderr counts", async ($, on) => {
		world(on, {});
		const r = await $.classic.PostToolUse(
			bash("git fetch | grep -v x", { stdout: "", stderr: "fatal: no remote" })
		);
		expect(r.additionalContext?.[0]).toContain("fatal: no remote");
	});
	test("no failure line adds nothing", async ($, on) => {
		world(on, {});
		const r = await $.classic.PostToolUse(
			bash("make | tail -5", { stdout: "built\n" })
		);
		expect(r.additionalContext).toBeUndefined();
	});
	test("an indented or mid-line error: adds nothing", async ($, on) => {
		world(on, {});
		const r = await $.classic.PostToolUse(
			bash("make | tail -5", { stdout: "  error: x\nsee error: y\n" })
		);
		expect(r.additionalContext).toBeUndefined();
	});
	test("an interrupted call adds nothing", async ($, on) => {
		world(on, {});
		const r = await $.classic.PostToolUse(
			bash("make | tail", { stdout: "error: x", interrupted: true })
		);
		expect(r.additionalContext).toBeUndefined();
	});
	test("no pipe, or || only, adds nothing", async ($, on) => {
		world(on, {});
		const a = await $.classic.PostToolUse(bash("make", { stdout: "error: x" }));
		const b = await $.classic.PostToolUse(
			bash("make || tail", { stdout: "error: x" })
		);
		expect(a.additionalContext).toBeUndefined();
		expect(b.additionalContext).toBeUndefined();
	});
});

import { describe, expect, test } from "bun:test";
import { spawn } from "node:child_process";
import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import { commandOf, forkOf, modeOf, PROMPT } from "../arena.ts";
import { armsOf, main } from "../main.ts";

describe("modeOf", () => {
	// Each arm has to differ from `base` in one thing only, or the round compares two changes at once.
	test("`base` forwards the summarizer's requests, which is what prices them", () => {
		expect(modeOf("base")).toBe("pass");
	});

	test("`proxy` answers them at the proxy, which is the second workaround", () => {
		expect(modeOf("proxy")).toBe("off");
	});

	test("`fork-off` also forwards, so its figures are comparable with `base`", () => {
		expect(modeOf("fork-off")).toBe("pass");
	});
});

describe("forkOf", () => {
	test("`base` and `proxy` turn the fork gate on, which is what lets the summarizer run", () => {
		expect(forkOf("base")).toBe("1");
		expect(forkOf("proxy")).toBe("1");
	});

	test("`fork-off` turns it off, which is the first workaround under test", () => {
		expect(forkOf("fork-off")).toBe("0");
	});
});

describe("commandOf", () => {
	// A non-interactive session never summarizes, so the pty is the measurement.
	test("runs the session on the pty helper and passes no print flag", () => {
		const cmd = commandOf("/tmp/session.log", "/tmp/debug.log", "1");

		expect(cmd[0]).toBe("python3");
		expect(cmd[2]).toContain("pty.py");
		expect(cmd).toContain("/tmp/session.log");
		expect(cmd).not.toContain("-p");
		expect(cmd).not.toContain("--print");
	});

	// `--debug` keeps the debug lines inside the TUI; `--debug-file` puts them where a reader can count them.
	test("sends the debug lines to a file, which is where the counts are read", () => {
		const cmd = commandOf("/tmp/session.log", "/tmp/debug.log", "1");

		expect(cmd[cmd.indexOf("--debug-file") + 1]).toBe("/tmp/debug.log");
	});

	// `flagSettings` outranks `userSettings`, so only it reaches the gate on a machine that sets it.
	test("carries the fork gate of the arm in `--settings`", () => {
		const cmd = commandOf("/tmp/session.log", "/tmp/debug.log", "1");

		expect(cmd[cmd.indexOf("--settings") + 1]).toBe(
			'{"env":{"CLAUDE_CODE_FORK_SUBAGENT":"1"}}',
		);
	});

	test("caps the spend of the arm", () => {
		const cmd = commandOf("/tmp/session.log", "/tmp/debug.log", "1");

		expect(cmd).toContain("--max-budget-usd");
		expect(Number(cmd[cmd.indexOf("--max-budget-usd") + 1])).toBeGreaterThan(0);
	});

	test("ends on the prompt, so the session starts its work without any typed input", () => {
		expect(commandOf("/tmp/session.log", "/tmp/debug.log", "1").at(-1)).toBe(
			PROMPT,
		);
	});
});

describe("pty.py", () => {
	const HELPER = path.join(import.meta.dir, "../pty.py");

	const ran = async (
		seconds: string,
		fake: string,
	): Promise<{ capture: string; code: number | null; ms: number }> => {
		const capture = `/tmp/pty-${process.pid}-${Math.random()}.log`;
		const started = Date.now();
		const code = await new Promise<number | null>((resolve) => {
			const child = spawn(
				"python3",
				["-I", HELPER, capture, seconds, "python3", "-I", "-c", fake],
				{ stdio: ["ignore", "ignore", "ignore"] },
			);
			child.on("close", resolve);
		});
		const text = await readFile(capture, "utf8").catch(() => "");
		await rm(capture, { force: true });
		return { capture: text, code, ms: Date.now() - started };
	};

	test("gives the session a tty, so `enableSummarization` can be true", async () => {
		const out = await ran(
			"10",
			"import sys; print('tty' if sys.stdout.isatty() else 'pipe')",
		);

		expect(out.capture).toContain("tty");
	});

	test("writes what the session drew, which is where the counts are read from", async () => {
		const out = await ran(
			"10",
			"print('\\x1b[2K[AgentSummary] Timer fired for agent agt_1')",
		);

		expect(out.capture).toContain("[AgentSummary] Timer fired");
	});

	test("stops a session that does not exit, so an arm cannot run past its deadline", async () => {
		const out = await ran("2", "import time; print('up'); time.sleep(60)");

		expect(out.code).toBe(0);
		expect(out.ms).toBeLessThan(20_000);
		expect(out.capture).toContain("up");
	}, 30_000);
});

const output = (): { write: (s: string) => void; text: () => string } => {
	const chunks: string[] = [];
	return { write: (s) => chunks.push(s), text: () => chunks.join("") };
};

describe("armsOf", () => {
	test("runs every arm when no arm is named", () => {
		expect(armsOf([])).toEqual(["base", "fork-off", "proxy"]);
	});

	test("`--only` runs the one arm it names", () => {
		expect(armsOf(["--only", "base"])).toEqual(["base"]);
	});

	test("an arm that does not exist falls back to every arm, so a typo measures something", () => {
		expect(armsOf(["--only", "basil"])).toEqual(["base", "fork-off", "proxy"]);
	});
});

describe("main", () => {
	test("bare, it prices the round, exits 0, and starts no session", async () => {
		const out = output();

		const code = await main([], out.write);

		expect(code).toBe(0);
		expect(out.text()).toContain("3 arms");
	});

	test("`--only` prices one arm, so a smoke costs one arm", async () => {
		const out = output();

		await main(["--only", "proxy"], out.write);

		expect(out.text()).toContain("1 arms (proxy)");
	});

	test("`--run` without `--dir` is a usage error, because the logs are the result", async () => {
		const code = await main(["--run"], output().write);

		expect(code).toBe(2);
	});
});

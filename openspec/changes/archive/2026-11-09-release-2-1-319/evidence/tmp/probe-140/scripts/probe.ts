import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
const root = "/private/tmp/probe-140/repo";
rmSync(root, { recursive: true, force: true });
rmSync("/tmp/probe-140/read-done", { force: true });
mkdirSync(root, { recursive: true });
writeFileSync(`${root}/GOAL-1.txt`, "goal one\n");
writeFileSync("/tmp/probe-140/src.txt", "restored\n");
Bun.spawnSync(["git", "init", "-q"], { cwd: root });
const prompt = `Do these steps in order, one tool call each, and nothing else. 1) Use the Read tool on ${root}/GOAL-1.txt. 2) Run this Bash command exactly: touch /tmp/probe-140/read-done; sleep 8 . 3) Run this Bash command exactly: cp /tmp/probe-140/src.txt GOAL-1.txt . Then report in one line what step 3 returned.`;
const p = Bun.spawn(
	[
		"claude",
		"-p",
		"--plugin-dir",
		"/Users/krystian/CodeProjects/xsyetopz/claudetto/plugins/claudetto",
		"--no-session-persistence",
		"--debug-file",
		"/tmp/probe-140/debug.log",
		"--model",
		"claude-haiku-5-5",
		"--allowedTools",
		"Read Bash",
		"--output-format",
		"json",
		prompt,
	],
	{
		cwd: root,
		stdout: "pipe",
		stderr: "pipe",
		env: { ...process.env, DISABLE_TELEMETRY: "1" },
	},
);
const t0 = Date.now();
while (!existsSync("/tmp/probe-140/read-done") && Date.now() - t0 < 120000)
	await Bun.sleep(200);
rmSync(`${root}/GOAL-1.txt`);
console.log("removed outside session at", Date.now() - t0, "ms");
console.log(await new Response(p.stdout).text());
console.log(
	"exit",
	await p.exited,
	"GOAL-1 exists:",
	existsSync(`${root}/GOAL-1.txt`),
);

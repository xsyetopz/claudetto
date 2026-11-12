// A subagent sees work/f.txt (by Read, Glob, or not at all), the probe deletes it outside the session, then the main loop
// Writes it. The gate asks (GATE_RECREATE) only if the subagent's call reached its recorded state.
import {
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";

import { startFake } from "/tmp/claudekit-leftovers/claudekit/src/fake/fake.ts";
const W = "/tmp/probe-18-1/work";
for (const how of ["Read", "Glob", "none"]) {
	rmSync(W, { recursive: true, force: true });
	mkdirSync(W);
	writeFileSync(`${W}/f.txt`, "x\n");
	const dir = `/tmp/probe-18-1/fake-seen-${how}`;
	rmSync(dir, { recursive: true, force: true });
	const sub =
		how === "Read"
			? { name: "Read", input: { file_path: `${W}/f.txt` } }
			: how === "Glob"
				? { name: "Glob", input: { pattern: "*.txt", path: W } }
				: { name: "Glob", input: { pattern: "*.md", path: W } };
	const plan = {
		steps: [
			{
				match: { hasTools: true, lastUserIncludes: "toolu_w1" },
				reply: {
					blocks: [{ type: "text", text: "main done" }],
					stop: "end_turn",
				},
			},
			{
				match: { hasTools: true, lastUserIncludes: "toolu_a1" },
				reply: {
					blocks: [
						{
							type: "tool_use",
							name: "Write",
							id: "toolu_w1",
							input: { file_path: `${W}/f.txt`, content: "y\n" },
						},
					],
					stop: "tool_use",
				},
			},
			{
				match: { hasTools: true, lastUserIncludes: "toolu_s1" },
				reply: {
					delayMs: 3000,
					blocks: [{ type: "text", text: "sub done" }],
					stop: "end_turn",
				},
			},
			{
				match: { hasTools: true, lastUserIncludes: "PROBE-SUB" },
				reply: {
					blocks: [{ type: "tool_use", id: "toolu_s1", ...sub }],
					stop: "tool_use",
				},
			},
			{
				match: { hasTools: true, lastUserIncludes: "go-agent" },
				reply: {
					blocks: [
						{
							type: "tool_use",
							name: "Agent",
							id: "toolu_a1",
							input: {
								subagent_type: "claudetto:Artemis",
								description: "probe",
								prompt: "PROBE-SUB look",
							},
						},
					],
					stop: "tool_use",
				},
			},
		],
		fallback: {
			blocks: [{ type: "text", text: "fallback" }],
			stop: "end_turn",
		},
	};
	const fake = await startFake({ plan, dir });
	const p = Bun.spawn(
		[
			"claude",
			"-p",
			"go-agent",
			"--plugin-dir",
			"/tmp/probe-122/arm-new",
			"--permission-mode",
			"acceptEdits",
			"--no-session-persistence",
			"--output-format",
			"stream-json",
			"--verbose",
		],
		{
			cwd: W,
			env: {
				...process.env,
				ANTHROPIC_BASE_URL: fake.url,
				ANTHROPIC_API_KEY: "fake",
				CLAUDE_CODE_OAUTH_TOKEN: "",
				CLAUDE_CONFIG_DIR: "/tmp/probe-18-1/cfg",
			},
			stdout: "pipe",
			stderr: "pipe",
		},
	);
	let out = "";
	let deleted = false;
	try {
		// Delete the file once the subagent's tool result reaches the fake (its reply is held 3 s).
		const t0 = Date.now();
		while (!deleted && Date.now() - t0 < 120_000) {
			await Bun.sleep(200);
			for (const f of existsSync(dir)
				? readdirSync(dir).filter((x) => x.endsWith(".body.json"))
				: []) {
				if (readFileSync(`${dir}/${f}`, "utf8").includes('toolu_s1"')) {
					rmSync(`${W}/f.txt`, { force: true });
					deleted = true;
					break;
				}
			}
		}
		out = await new Response(p.stdout).text();
		await p.exited;
	} finally {
		p.kill();
		await fake.stop();
	}
	const subResult = out
		.split("\n")
		.filter((l) => l.includes("toolu_s1") && l.includes("tool_result"))
		.map((l) => (l.match(/"content":"([^"]{0,80})/) ?? [])[1])
		.join("|");
	console.log(how, {
		deleted,
		subResult,
		asked: out.includes("existed earlier in this session"),
		written: existsSync(`${W}/f.txt`),
	});
}

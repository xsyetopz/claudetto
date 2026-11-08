// Spawns each read-only claudetto agent from a fake API and prints the tool names its own first request carries.
import { startFake, readRequests } from "/tmp/claudekit-leftovers/claudekit/src/fake/fake.ts";
for (const a of ["Artemis", "Metis"]) {
	const dir = `/tmp/probe-18-1/fake-${a}`;
	const plan = { steps: [
		{ match: { hasTools: true, lastUserIncludes: "go-agent" }, reply: { blocks: [{ type: "tool_use", name: "Agent", id: "toolu_a1", input: { subagent_type: `claudetto:${a}`, description: "probe", prompt: "PROBE-SUB find foo" } }], stop: "tool_use" } },
	], fallback: { blocks: [{ type: "text", text: "done" }], stop: "end_turn" } };
	const fake = await startFake({ plan, dir });
	const p = Bun.spawn(["claude", "-p", "go-agent", "--plugin-dir", "/tmp/probe-122/arm-new", "--permission-mode", "acceptEdits", "--no-session-persistence"], { cwd: "/tmp/probe-18-1", env: { ...process.env, ANTHROPIC_BASE_URL: fake.url, ANTHROPIC_API_KEY: "fake", CLAUDE_CODE_OAUTH_TOKEN: "", CLAUDE_CONFIG_DIR: "/tmp/probe-18-1/cfg" }, stdout: "pipe", stderr: "pipe" });
	try { await p.exited; } finally { p.kill(); await fake.stop(); }
	const sub = (await readRequests(dir)).filter((r) => JSON.stringify(r.body.messages ?? []).includes("PROBE-SUB") && !JSON.stringify(r.body.messages ?? []).includes("go-agent"));
	console.log(a, sub.length, sub[0] ? (sub[0].body.tools as any[]).map((t) => t.name).join(",") : "no subagent request");
}

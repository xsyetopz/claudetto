// Captures the tool names of the first main request, bare and with the current plugin.
import { startFake, readRequests } from "/tmp/claudekit-leftovers/claudekit/src/fake/fake.ts";
for (const [name, extra] of [["bare", []], ["plugin", ["--plugin-dir", "/tmp/probe-122/arm-new"]]] as const) {
	const fake = await startFake({ plan: { steps: [] }, dir: `/tmp/probe-18-1/fake-${name}` });
	const p = Bun.spawn(["claude", "-p", "hi", ...extra, "--no-session-persistence"], { cwd: "/tmp/probe-18-1", env: { ...process.env, ANTHROPIC_BASE_URL: fake.url, ANTHROPIC_API_KEY: "fake", CLAUDE_CODE_OAUTH_TOKEN: "", CLAUDE_CONFIG_DIR: "/tmp/probe-18-1/cfg" }, stdout: "pipe", stderr: "pipe" });
	try { await p.exited; } finally { p.kill(); await fake.stop(); }
	const reqs = (await readRequests(`/tmp/probe-18-1/fake-${name}`)).filter((r) => r.body.tools?.length);
	const tools = (reqs[0]?.body.tools ?? []) as { name: string }[];
	console.log(name, reqs.length, tools.map((t) => t.name).sort().join(","), JSON.stringify(tools).length);
}

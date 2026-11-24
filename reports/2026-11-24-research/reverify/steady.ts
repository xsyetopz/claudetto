// Two `claude -p hi` launches in one fresh config dir against the fake API, the plugins loaded both
// times. The first launch lets claudetto's session.start fill write user settings; the second shows
// the steady state those settings bind. Prints, for the second launch's first request, the tool names
// and whether a builtin plugin's skill (plugin-authoring) is listed, plus the fill notice of launch 1
// and any "not matched" permission-rule warning on stderr (RISK-536).
// Usage: bun reports/2026-11-24-research/reverify/steady.ts
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { startFakeApi } from "../../../tools/measure-tools/fake-api";
import { toolsOf } from "../../../tools/measure-tools/measure";

const plugins = [
	"plugins/claudetto",
	"plugins/claudetto-spec",
	"plugins/claudetto-you-should-know"
].flatMap((p) => ["--plugin-dir", resolve(p)]);

async function launch(config: string, url: string): Promise<string> {
	const proc = Bun.spawn(
		[
			"claude",
			"-p",
			"hi",
			"--output-format",
			"stream-json",
			"--verbose",
			...plugins
		],
		{
			cwd: config,
			stdout: "pipe",
			stderr: "pipe",
			env: {
				...process.env,
				CLAUDE_CONFIG_DIR: config,
				ANTHROPIC_BASE_URL: url,
				ANTHROPIC_API_KEY: "sk-ant-fake",
				DISABLE_TELEMETRY: "1"
			}
		}
	);
	const out = await new Response(proc.stdout).text();
	const err = await new Response(proc.stderr).text();
	if (err.includes("not matched")) {
		console.log(`stderr warns: ${err.slice(0, 200)}`);
	}
	await proc.exited;
	return out;
}

const config = await mkdtemp(join(tmpdir(), "reverify-steady-"));
try {
	const warm = startFakeApi(false);
	const first = await launch(config, warm.url);
	await warm.stop();
	for (const line of first.split("\n")) {
		if (line.includes('"ui_log"')) {
			console.log(
				`launch 1 notice: ${(JSON.parse(line) as { text: string }).text.slice(-160)}`
			);
		}
	}
	const api = startFakeApi(false);
	await launch(config, api.url);
	await api.stop();
	const main = api.requests.find((r) => toolsOf(r.body).length > 0);
	if (main === undefined) {
		throw new Error("launch 2 sent no request with tools");
	}
	const names = toolsOf(main.body).map(
		(t) => (t as { name?: string }).name ?? "?"
	);
	const text = JSON.stringify(main.body);
	console.log(`launch 2 tools (${names.length}): ${names.join(" ")}`);
	console.log(`launch 2 bytes: ${text.length}`);
	console.log(
		`launch 2 lists the plugin-authoring skill: ${text.includes("plugin-authoring")}`
	);
	for (const word of [
		"Workflow",
		"ScheduleWakeup",
		"ReportFindings",
		"CronCreate",
		"EnterPlanMode"
	]) {
		console.log(`launch 2 sends tool ${word}: ${names.includes(word)}`);
	}
} finally {
	await rm(config, { recursive: true, force: true });
}

// 2.1.329 reruns on the fake API, each launch in an empty CLAUDE_CONFIG_DIR, so nothing is billed.
// (a) REQ-VERIFICATION-030: `claude -p hi --plugin-dir` with an absolute dir and with a relative dir
//     resolved from another cwd; prints the init event's plugins and plugin_errors and the request count.
// (b) REQ-SPEC-009: the skill-listing lines of request 1 that name claudetto-spec.
// (c) REQ-TOOLS-005: the tools of a `claudetto:Hermes` subagent request and of the main request.
// Usage: bun reports/2026-11-24-research/pin-2-1-329/listing.ts
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";

import {
	isSubagentRequest,
	startFakeApi
} from "../../../tools/measure-tools/fake-api";
import { toolsOf } from "../../../tools/measure-tools/measure";

async function launch(args: string[], cwd: string | undefined, agent?: string) {
	const config = await mkdtemp(join(tmpdir(), "pin-listing-"));
	const api = startFakeApi(agent !== undefined, agent);
	const proc = Bun.spawn(["claude", "-p", "hi", ...args], {
		cwd: cwd ?? config,
		stdout: "pipe",
		stderr: "pipe",
		env: {
			...process.env,
			CLAUDE_CONFIG_DIR: config,
			ANTHROPIC_BASE_URL: api.url,
			ANTHROPIC_API_KEY: "sk-ant-fake",
			DISABLE_TELEMETRY: "1"
		}
	});
	const stdout = await new Response(proc.stdout).text();
	const code = await proc.exited;
	await api.stop();
	await rm(config, { recursive: true, force: true });
	return { code, stdout, requests: api.requests };
}

const stream = ["--output-format", "stream-json", "--verbose"];
const abs = resolve("plugins/claudetto");
for (const [label, dir, cwd] of [
	["absolute", abs, undefined],
	["relative", relative(tmpdir(), abs), tmpdir()]
] as const) {
	const run = await launch(["--plugin-dir", dir, ...stream], cwd);
	const init = run.stdout
		.split("\n")
		.filter((l) => l.includes('"subtype":"init"'))
		.map(
			(l) => JSON.parse(l) as { plugins?: unknown; plugin_errors?: unknown }
		)[0];
	console.log(
		`(a) ${label} ${dir}: exit ${run.code}, ${run.requests.length} request(s), plugins ${JSON.stringify(init?.plugins)}, plugin_errors ${JSON.stringify(init?.plugin_errors ?? null)}`
	);
}

const spec = await launch(
	["--plugin-dir", resolve("plugins/claudetto-spec")],
	undefined
);
const body = JSON.stringify(spec.requests[0]?.body ?? {});
const lines = body
	.split("\\n")
	.filter((l) => l.startsWith("- claudetto-spec:"))
	.map((l) => l.slice(0, 120));
console.log(
	`(b) claudetto-spec listing: ${lines.length} line(s): ${lines.join(" | ")}`
);

const hermes = await launch(
	["--plugin-dir", abs],
	undefined,
	"claudetto:Hermes"
);
for (const r of hermes.requests) {
	const side = isSubagentRequest(r.body.messages) ? "subagent" : "main";
	console.log(
		`(c) ${side}: ${toolsOf(r.body)
			.map((t) => (t as { name?: string }).name)
			.join(" ")}`
	);
}

// REQ-GUARDS-078 per-call cost: a scripted fake API answers N main-loop requests in a row with one
// Bash call each, then text. The gap from serving reply k to receiving request k+1 is the time the
// engine spends on one tool call, hooks included. Arms: vanilla and the claudetto plugin, each with
// a command that prints nothing (`true`) and one that prints a line (`echo hello`), to see whether
// the output changes the redact scan cost. Each arm launches twice in one CLAUDE_CONFIG_DIR and
// times the second launch. PLUGIN_DIR names another plugin copy; ARMS=plugin or ARMS=vanilla runs one arm on `true`;
// SETTINGS passes --settings.
// Usage: bun reports/2026-11-24-research/pin-2-1-329/codemode/percall.ts [N]
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { streamedReply } from "../../../../tools/measure-tools/fake-api";

const N = Number(process.argv[2] ?? 40);

async function arm(plugin: boolean, command: string): Promise<string> {
	const root = await mkdtemp(join(tmpdir(), "percall-"));
	const config = join(root, "config");
	let k = 0;
	let served = 0;
	const gaps: number[] = [];
	const server = Bun.serve({
		port: 0,
		hostname: "127.0.0.1",
		async fetch(req) {
			if (
				req.method !== "POST" ||
				!new URL(req.url).pathname.startsWith("/v1/messages")
			) {
				return Response.json({});
			}
			const body = (await req.json()) as { tools?: unknown[] };
			const main = (body.tools?.length ?? 0) > 0;
			if (main && served > 0) {
				gaps.push(performance.now() - served);
			}
			const reply =
				main && k < N
					? streamedReply({
							tool: "Bash",
							input: { command, description: "Run" }
						}).replaceAll("toolu_fake", `toolu_fake_${++k}`)
					: streamedReply({ text: "ok" });
			served = main && k <= N ? performance.now() : 0;
			return new Response(reply, {
				headers: { "content-type": "text/event-stream" }
			});
		}
	});
	const extra = [
		...(plugin
			? [
					"--plugin-dir",
					resolve(process.env["PLUGIN_DIR"] ?? "plugins/claudetto")
				]
			: []),
		...(process.env["SETTINGS"] ? ["--settings", process.env["SETTINGS"]] : [])
	];
	for (const launch of [1, 2]) {
		k = 0;
		served = 0;
		gaps.length = 0;
		const proc = Bun.spawn(
			[
				"claude",
				"-p",
				"run it",
				"--permission-mode",
				"bypassPermissions",
				...extra
			],
			{
				cwd: root,
				stdout: "ignore",
				stderr: "ignore",
				env: {
					...process.env,
					CLAUDE_CONFIG_DIR: config,
					ANTHROPIC_BASE_URL: `http://127.0.0.1:${server.port}`,
					ANTHROPIC_API_KEY: "sk-ant-fake",
					DISABLE_TELEMETRY: "1"
				}
			}
		);
		await proc.exited;
		void launch;
	}
	await server.stop(true);
	await rm(root, { recursive: true, force: true });
	const s = [...gaps].sort((a, b) => a - b);
	const at = (p: number): string =>
		(s[Math.floor(p * (s.length - 1))] ?? Number.NaN).toFixed(0);
	return `${plugin ? "claudetto" : "vanilla"}\t${command}\tcalls ${s.length}\tp50 ${at(0.5)} ms\tp90 ${at(0.9)} ms`;
}

const ARMS =
	process.env["ARMS"] === "plugin"
		? [true]
		: process.env["ARMS"] === "vanilla"
			? [false]
			: [false, true];
const COMMANDS =
	process.env["ARMS"] !== undefined ? ["true"] : ["true", "echo hello"];
for (const command of COMMANDS) {
	for (const plugin of ARMS) {
		console.log(await arm(plugin, command));
	}
}

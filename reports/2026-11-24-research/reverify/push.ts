// REQ-VERIFICATION-090 rerun: a scripted fake API answers the first main-loop request with a Bash
// `git push origin HEAD` in a scratch repo whose origin is a local bare repo. Each arm (vanilla, and
// the claudetto plugin) launches twice in one empty CLAUDE_CONFIG_DIR, since the plugin's settings
// fill binds from the next launch. It prints the tool_result the model got back on the second launch
// and whether the bare remote received the branch.
// Usage: bun reports/2026-11-24-research/reverify/push.ts ["<command>"] (default: git push origin HEAD)
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { streamedReply } from "../../../tools/measure-tools/fake-api";

const PUSH = process.argv[2] ?? "git push origin HEAD";

function fakeApi() {
	const results: string[] = [];
	let pushed = false;
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
			const body = (await req.json()) as {
				tools?: unknown[];
				messages?: unknown;
			};
			const text = JSON.stringify(body.messages ?? []);
			if (text.includes('"tool_result"')) {
				results.push(
					text.slice(
						text.lastIndexOf('"tool_result"'),
						text.lastIndexOf('"tool_result"') + 400
					)
				);
			}
			const reply =
				!pushed &&
				(body.tools?.length ?? 0) > 0 &&
				!text.includes('"tool_result"')
					? ((pushed = true),
						{ tool: "Bash", input: { command: PUSH, description: "Push" } })
					: { text: "ok" };
			return new Response(streamedReply(reply), {
				headers: { "content-type": "text/event-stream" }
			});
		}
	});
	return {
		url: `http://127.0.0.1:${server.port}`,
		results,
		reset: () => {
			pushed = false;
			results.length = 0;
		},
		stop: () => server.stop(true)
	};
}

async function arm(plugin: boolean) {
	const root = await mkdtemp(join(tmpdir(), "reverify-push-"));
	const [config, work, remote] = ["config", "work", "remote.git"].map((d) =>
		join(root, d)
	);
	await Bun.$`git init -q --bare ${remote} && git init -q ${work}`.quiet();
	await Bun.$`git -C ${work} -c user.email=t@t -c user.name=t commit -q --allow-empty -m seed && git -C ${work} -c tag.gpgSign=false tag v1 && git -C ${work} remote add origin ${remote}`.quiet();
	const api = fakeApi();
	const extra = plugin ? ["--plugin-dir", resolve("plugins/claudetto")] : [];
	let stderr = "";
	for (const launch of [1, 2]) {
		api.reset();
		const proc = Bun.spawn(["claude", "-p", "push the branch", ...extra], {
			cwd: work,
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
		stderr = await new Response(proc.stderr).text();
		await proc.exited;
		if (launch === 1) {
			continue;
		}
	}
	const refs = (
		await Bun.$`git -C ${remote} for-each-ref`.quiet().text()
	).trim();
	await api.stop();
	await rm(root, { recursive: true, force: true });
	console.log(
		`${plugin ? "claudetto" : "vanilla"}: remote refs ${refs === "" ? "none" : refs}; tool_result ${api.results.at(-1) ?? "none"}; stderr ${stderr.trim().slice(0, 160) || "none"}`
	);
}

await arm(false);
await arm(true);

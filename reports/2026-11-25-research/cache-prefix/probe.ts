// Where does the first request of two sessions in different folders first differ, and where
// do its cache breakpoints sit? Bytes before the first difference and before a breakpoint are
// read from cache by the second session; the rest is written again.
// Usage: bun probe.ts [plugin-dir]
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { startFakeApi } from "../../../tools/measure-tools/fake-api";

const pluginDir = Bun.argv[2];

async function firstRequest(): Promise<Record<string, unknown>> {
	const api = startFakeApi(false);
	const config = await mkdtemp(join(tmpdir(), "cfg-"));
	const cwd = await mkdtemp(join(tmpdir(), "work-"));
	await Bun.$`git init -q ${cwd}`.quiet();
	await Bun.write(join(cwd, "a.ts"), "export const a = 1;\n");
	const proc = Bun.spawn(
		[
			"claude",
			"-p",
			"Say ok.",
			"--no-session-persistence",
			"--model",
			"claude-haiku-5-5",
			...(pluginDir === undefined ? [] : ["--plugin-dir", resolve(pluginDir)])
		],
		{
			cwd,
			stdout: "pipe",
			stderr: "pipe",
			env: {
				...process.env,
				CLAUDE_CONFIG_DIR: config,
				ANTHROPIC_BASE_URL: api.url,
				ANTHROPIC_API_KEY: "sk-ant-fake",
				DISABLE_TELEMETRY: "1",
				CLAUDE_CODE_EFFORT_LEVEL: "high"
			}
		}
	);
	await proc.exited;
	await api.stop();
	const main = api.requests.filter(
		(r) =>
			Array.isArray(r.body["tools"]) &&
			(r.body["tools"] as unknown[]).length > 0
	);
	const req = main[0];
	if (req === undefined)
		throw new Error(`no main request (${api.requests.length} captured)`);
	return req.body;
}

/** The prompt in the API's cache order, with each breakpoint marked. */
function flatten(body: Record<string, unknown>): {
	text: string;
	marks: number[];
	parts: [number, string][];
} {
	let text = "";
	const marks: number[] = [];
	const parts: [number, string][] = [];
	const add = (label: string, block: unknown) => {
		parts.push([text.length, label]);
		const b = block as Record<string, unknown>;
		const { cache_control: cc, ...rest } = b;
		text += JSON.stringify(rest);
		if (cc !== undefined) marks.push(text.length);
	};
	(body["tools"] as unknown[]).forEach((t, i) =>
		add(`tools[${i}] ${(t as { name?: string }).name}`, t)
	);
	const sys = body["system"];
	(Array.isArray(sys) ? sys : [{ type: "text", text: String(sys) }]).forEach(
		(s, i) => add(`system[${i}]`, s)
	);
	(body["messages"] as { role: string; content: unknown }[]).forEach((m, i) => {
		const content = Array.isArray(m.content)
			? m.content
			: [{ type: "text", text: m.content }];
		content.forEach((c, j) => add(`messages[${i}].${m.role}[${j}]`, c));
	});
	return { text, marks, parts };
}

const [a, b] = [flatten(await firstRequest()), flatten(await firstRequest())];
let diff = 0;
while (diff < a.text.length && a.text[diff] === b.text[diff]) diff++;
const where = (pos: number) =>
	[...a.parts].reverse().find(([at]) => at <= pos)?.[1];
const tok = (n: number) => Math.round(n / 4);
console.log(
	JSON.stringify(
		{
			plugin: pluginDir ?? "none",
			totalTokens: tok(a.text.length),
			firstDiffTokens: tok(diff),
			firstDiffIn: where(diff),
			context: JSON.stringify(a.text.slice(Math.max(0, diff - 60), diff + 60)),
			breakpoints: a.marks.map((m) => ({ atTokens: tok(m), in: where(m - 1) })),
			parts: a.parts.map(([at, label]) => `${tok(at)} ${label}`)
		},
		null,
		1
	)
);

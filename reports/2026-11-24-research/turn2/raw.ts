// Turn-two growth, real API: runs one prompt per arm (vanilla, claudetto plugin) in a fresh git repo
// with OTEL_LOG_RAW_API_BODIES=file:<dir>, then prints per main-loop request the system and tools
// sizes, the message blocks it adds over the previous request, and the result usage (cache TTL split).
// PROMPT and MODEL override the defaults. Run unsandboxed: it calls the API and spends a few cents.
// Usage: bun reports/2026-11-24-research/turn2/raw.ts
import { mkdtemp, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

type Block = {
	type: string;
	text?: string;
	content?: unknown;
	name?: string;
	input?: unknown;
};
type Body = {
	tools?: { name: string }[];
	system?: { text: string }[];
	messages: { role: string; content: string | Block[] }[];
};

const prompt = process.env["PROMPT"] ?? "Fix the typo in README.md";
const model = process.env["MODEL"] ?? "claude-sonnet-5-5";

const flat = (m: Body["messages"]): string[] =>
	m.flatMap((x) =>
		typeof x.content === "string"
			? [`${x.role}: ${x.content}`]
			: x.content.map(
					(b) =>
						`${x.role}/${b.type}: ${b.text ?? (b.name ? `${b.name} ${JSON.stringify(b.input)}` : JSON.stringify(b.content ?? ""))}`
				)
	);

async function arm(plugin: boolean): Promise<void> {
	const root = await mkdtemp(join(tmpdir(), "raw-"));
	const repo = join(root, "repo");
	const bodies = join(root, "bodies");
	await Bun.write(join(repo, "README.md"), "# Demo\n\nThis is teh readme.\n");
	await Bun.$`git init -q && git add -A && git -c user.email=a@b -c user.name=a commit -qm init`
		.cwd(repo)
		.quiet();
	const out =
		await Bun.$`claude -p ${prompt} --model ${model} --permission-mode bypassPermissions --output-format json ${plugin ? ["--plugin-dir", resolve("plugins/claudetto")] : []}`
			.cwd(repo)
			.env({
				...process.env,
				CLAUDE_CODE_ENABLE_TELEMETRY: "1",
				OTEL_LOGS_EXPORTER: "console",
				OTEL_LOG_RAW_API_BODIES: `file:${bodies}`
			})
			.quiet()
			.nothrow();
	const result = JSON.parse(out.stdout.toString()) as {
		usage: unknown;
		num_turns: number;
		total_cost_usd: number;
	};
	const files = (await readdir(bodies)).filter((f) =>
		f.endsWith(".request.json")
	);
	const reqs = await Promise.all(
		files.map(async (f) => ({
			f,
			t: Bun.file(join(bodies, f)).lastModified,
			b: (await Bun.file(join(bodies, f)).json()) as Body
		}))
	);
	const main = reqs
		.filter((r) => (r.b.tools?.length ?? 0) > 0)
		.sort((a, b) => a.b.messages.length - b.b.messages.length || a.t - b.t);
	const name = plugin ? "claudetto" : "vanilla";
	console.log(
		`== ${name}: turns ${result.num_turns} cost $${result.total_cost_usd.toFixed(4)} bodies ${bodies}`
	);
	console.log(`   usage ${JSON.stringify(result.usage)}`);
	let prev = new Set<string>();
	for (const [i, r] of main.entries()) {
		const sys = JSON.stringify(r.b.system ?? []).length;
		const tools = JSON.stringify(r.b.tools ?? []).length;
		console.log(
			`-- request ${i + 1}: system ${sys} tools ${tools} (${r.b.tools?.length}) messages ${JSON.stringify(r.b.messages).length}`
		);
		const cur = flat(r.b.messages);
		for (const x of cur.filter((y) => !prev.has(y))) {
			console.log(`   + ${x.length} ${x.slice(0, 220).replaceAll("\n", "⏎")}`);
		}
		prev = new Set(cur);
	}
}

await arm(false);
await arm(true);

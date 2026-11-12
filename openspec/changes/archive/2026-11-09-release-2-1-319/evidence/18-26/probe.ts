// 18.26: byte-diff the request bodies of one plugin session on the fake Messages API (no paid call).
// Usage: bun probe.ts <out-dir> [plugin|base] [popup] [--flag=value ...] [KEY=VALUE ...]   (out-dir under /tmp/probe-18-26*)
// Prints, per consecutive pair of main-loop requests, the first byte where tools, system and messages differ.
import { mkdirSync, realpathSync } from "node:fs";
import { join } from "node:path";
const K = "/tmp/claudekit-leftovers/claudekit";
const { startFake } = await import(`${K}/src/fake/fake.ts`);
const { buildLaunch, launch, prepare, runFiles } = await import(
	`${K}/src/launcher/launcher.ts`
);
const { createRun } = await import(`${K}/src/workspace/workspace.ts`);
const { materializeArm } = await import(`${K}/src/arm/arm.ts`);
const { MODELS } = await import(`${K}/src/shared/model.ts`);

// A "popup" word among the args runs the session as the SDK host (stream-json over stdin, as 18.20 round 7 did), so AskUserQuestion and the mcp tools are listed.
const [out = "", which = "plugin", ...rest] = Bun.argv.slice(2);
const popup = rest.includes("popup");
const agentPlan = rest.includes("agent");
const envArgs = rest.filter((a) => a.includes("=") && !a.startsWith("--"));
const extraFlags = rest
	.filter((a) => a.startsWith("--"))
	.flatMap((a) => a.split("="));
mkdirSync(out, { recursive: true });
await Bun.write(join(out, ".created-by-claudetto"), "");
const PLUGIN = join(import.meta.dir, "../../../../../plugins/claudetto");
const env = Object.fromEntries(
	envArgs.map((a) => a.split("=") as [string, string]),
);
const arm = {
	name: which,
	plugins: which === "plugin" ? [{ dir: PLUGIN }] : [],
	model: MODELS.sonnet,
	expect: {},
	flags: ["--permission-mode", "acceptEdits", ...extraFlags],
	env: { DISABLE_ERROR_REPORTING: "1", ...env },
};

const run = await createRun({
	probe: "probe-18-26",
	root: `${out}/runs`,
	quiet: true,
});
const files = runFiles(run);
const { pluginDirs, treeHashes } = await materializeArm(arm, run);
await Bun.write(join(files.work, "a.txt"), "hello\n");
await Bun.write(join(files.work, "b.txt"), "world\n");
const read = (p: string) => ({
	type: "tool_use",
	name: "Read",
	input: { file_path: join(realpathSync(files.work), p) },
});
const plan = {
	steps: agentPlan
		? [
				{
					match: { hasTools: true },
					reply: {
						blocks: [
							{
								type: "tool_use",
								name: "Agent",
								input: {
									description: "look",
									subagent_type: "claudetto:Artemis",
									prompt: "List the files here.",
									run_in_background: false,
								},
							},
						],
						stop: "tool_use",
					},
				},
			]
		: [
				{ reply: { blocks: [read("a.txt")], stop: "tool_use" } },
				{ reply: { blocks: [read("b.txt")], stop: "tool_use" } },
			],
	fallback: { blocks: [{ type: "text", text: "done" }] },
};
const fake = await startFake({ plan, dir: join(run.dir, "requests") });
const { runPopup } = await import("../18-20/popup.ts");
try {
	const spec = {
		prompt: "read a.txt and b.txt",
		mode: "stream-json",
		model: arm.model,
		auth: "fake",
		pluginDirs,
		pluginTreeHashes: treeHashes,
		settings: {},
		settingSources: ["project", "local"],
		env: arm.env,
		flags: arm.flags,
		cwd: realpathSync(files.work),
		arm: arm.name,
		case: "p",
		capTokens: 300_000,
		baseUrl: fake.url,
	};
	if (popup) {
		const l = buildLaunch(spec, run);
		await prepare(spec, l);
		await runPopup(l, spec.prompt, 300_000);
	} else await launch(spec, run);
} finally {
	await fake.stop();
}

const strip = (v: unknown): unknown =>
	Array.isArray(v)
		? v.map(strip)
		: v && typeof v === "object"
			? Object.fromEntries(
					Object.entries(v)
						.filter(([k]) => k !== "cache_control")
						.map(([k, x]) => [k, strip(x)]),
				)
			: v;
const reqs: { n: number; body: any }[] = [];
for await (const f of new Bun.Glob("*.body.json").scan(
	join(run.dir, "requests"),
))
	reqs.push({
		n: Number(f.slice(0, 4)),
		body: JSON.parse(await Bun.file(join(run.dir, "requests", f)).text()),
	});
reqs.sort((a, b) => a.n - b.n);
console.log("all requests (n, tools, system chars, markers, 1h markers):");
for (const r of reqs) {
	const j = JSON.stringify(r.body);
	console.log(
		"  #" + r.n,
		r.body.model,
		r.body.tools?.length ?? 0,
		JSON.stringify(r.body.system).length,
		(j.match(/"cache_control"/g) ?? []).length,
		(j.match(/"ttl":"1h"/g) ?? []).length,
		(r.body.tools ?? []).map((t: any) => t.name).join(","),
	);
}
const main = reqs.filter(
	(r) => Array.isArray(r.body.tools) && r.body.tools.length > 3,
);
const firstDiff = (a: string, b: string) => {
	let i = 0;
	while (i < a.length && i < b.length && a[i] === b[i]) i++;
	return i;
};
console.log(
	`requests ${reqs.length}, main-loop ${main.length}; cache_control markers per main request:`,
);
for (const r of main) {
	const s = JSON.stringify(r.body);
	console.log(
		`  #${r.n} tools ${r.body.tools.length} markers ${(s.match(/"cache_control"/g) ?? []).length} ${(s.match(/"ttl":"1h"/g) ?? []).length}x1h bytes ${s.length}`,
	);
}
for (let i = 1; i < main.length; i++) {
	const [a, b] = [main[i - 1].body, main[i].body];
	for (const part of ["tools", "system", "messages"]) {
		const x = JSON.stringify(strip(a[part]));
		const y = JSON.stringify(strip(b[part]));
		const keep = part === "messages" ? y.startsWith(x.slice(0, -1)) : x === y;
		const at = firstDiff(x, y);
		console.log(
			`#${main[i - 1].n}->#${main[i].n} ${part}: ${keep ? "kept" : `DIFF at byte ${at}: ${x.slice(Math.max(0, at - 60), at + 120)}  ||  ${y.slice(Math.max(0, at - 60), at + 120)}`}`,
		);
	}
}

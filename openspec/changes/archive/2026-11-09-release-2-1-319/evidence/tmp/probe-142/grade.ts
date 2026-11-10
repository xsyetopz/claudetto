// usage: bun --env-file=<repo>/.env grade.ts SPLIT(tune|held|all) [MODEL] [CONC]
import {
	type GradeFault,
	VERIFY_GRADE,
} from "/Users/krystian/CodeProjects/xsyetopz/claudetto/plugins/claudetto/hooks/texts.ts";
import { parseFaults } from "/Users/krystian/CodeProjects/xsyetopz/claudetto/plugins/claudetto/hooks/verify.ts";
const [split = "tune", model = "haiku", conc = "8"] = Bun.argv.slice(2);
const fx = (await Bun.file("/tmp/probe-142/fixtures.json").json()).filter(
	(f: any) => split === "all" || f.split === split,
);
const env: Record<string, string> = {};
for (const [k, v] of Object.entries(process.env))
	if (
		v !== undefined &&
		!/^(CLAUDECODE|AI_AGENT|CLAUDE_PID|CLAUDE_EFFORT|CLAUDE_AUTOCOMPACT_PCT_OVERRIDE|CLAUDE_CODE_(?!OAUTH_TOKEN))/.test(
			k,
		)
	)
		env[k] = v;
Object.assign(env, {
	CLAUDE_CONFIG_DIR: "/tmp/probe-122/cfg",
	DISABLE_TELEMETRY: "1",
	DISABLE_ERROR_REPORTING: "1",
	DISABLE_AUTOUPDATER: "1",
});
const codesFor = (f: any): GradeFault[] =>
	[
		"credited",
		"fallback",
		...(f.tools === 0 ? ["unchecked", "rules"] : []),
		...(f.wroteIssues ? [] : ["unfiled"]),
	] as GradeFault[];
const rows: any[] = [];
let n = 0,
	usd = 0;
const run = async (f: any) => {
	const codes = codesFor(f);
	const prompt = VERIFY_GRADE(f.people, f.shown ?? [], f.user, f.reply, codes);
	const t0 = Date.now();
	const p = Bun.spawn(
		[
			"claude",
			"-p",
			prompt,
			"--model",
			model,
			"--tools",
			"",
			"--setting-sources",
			"",
			"--disable-slash-commands",
			"--no-session-persistence",
			"--output-format",
			"json",
		],
		{
			cwd: "/tmp/probe-142",
			env,
			stdin: "ignore",
			stdout: "pipe",
			stderr: "pipe",
		},
	);
	const out = await new Response(p.stdout).text();
	await p.exited;
	let j: any = {};
	try {
		j = JSON.parse(out);
	} catch {}
	usd += Number(j.total_cost_usd ?? 0);
	const found = parseFaults(String(j.result ?? ""), codes, f.reply);
	rows.push({
		id: f.id,
		kind: f.kind,
		fault: f.fault,
		split: f.split,
		found,
		ms: Date.now() - t0,
		usd: j.total_cost_usd,
		raw: String(j.result ?? "").slice(0, 200),
		models: Object.keys(j.modelUsage ?? {}),
	});
};
await Promise.all(
	Array.from({ length: Number(conc) }, async () => {
		for (let i = n++; i < fx.length; i = n++) await run(fx[i]);
	}),
);
const pos = rows.filter((r) => r.fault),
	neg = rows.filter((r) => !r.fault);
const faults = ["credited", "rules", "unfiled", "fallback"];
console.log(
	`split=${split} model=${model} usd=${usd.toFixed(4)} models=${[...new Set(rows.flatMap((r) => r.models))]}`,
);
let tp0 = 0,
	fn0 = 0;
for (const c of faults) {
	const tp = pos.filter((r) => r.fault === c && r.found.includes(c)).length,
		np = pos.filter((r) => r.fault === c).length;
	const fp = rows.filter((r) => r.fault !== c && r.found.includes(c)).length;
	tp0 += tp;
	fn0 += np - tp;
	console.log(
		`${c.padEnd(9)} recall ${tp}/${np}  false-flags ${fp}  precision ${tp + fp ? (tp / (tp + fp)).toFixed(2) : "n/a"}`,
	);
}
const fpn = neg.filter((r) => r.found.some((c: string) => c !== "unchecked"));
const unchk = neg.filter((r) => r.found.includes("unchecked")).map((r) => r.id);
console.log(
	"unchecked (pre-existing claim check) on negatives:",
	unchk.join(","),
);
console.log(
	`negatives flagged: ${fpn.length}/${neg.length} = ${((100 * fpn.length) / neg.length).toFixed(1)}%  (clean ${neg.filter((r) => r.kind === "negative").filter((r) => r.found.some((c: string) => c !== "unchecked")).length}/${neg.filter((r) => r.kind === "negative").length}, near-miss ${neg.filter((r) => r.kind === "near-miss").filter((r) => r.found.some((c: string) => c !== "unchecked")).length}/${neg.filter((r) => r.kind === "near-miss").length})`,
);
console.log(
	`latency ms: median ${rows.map((r) => r.ms).sort((a, b) => a - b)[rows.length >> 1]}`,
);
for (const r of rows.filter(
	(r) =>
		(r.fault && !r.found.includes(r.fault)) ||
		(!r.fault && r.found.some((c: string) => c !== "unchecked")),
))
	console.log(
		"MISS",
		r.id,
		r.fault ?? "-",
		"found",
		r.found,
		r.raw.replace(/\n/g, " "),
	);
await Bun.write(
	`/tmp/probe-142/res-${split}-${Date.now()}.json`,
	JSON.stringify(rows, null, 1),
);

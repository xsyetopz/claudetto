import { held } from "/tmp/probe-144/held.ts";
// Grades the held-out set exactly as limits/stop.ts ships: VERIFY_GRADE with ["unseen"] alone, results in claimTurn's format.
import { VERIFY_GRADE } from "/Users/krystian/CodeProjects/xsyetopz/claudetto/plugins/claudetto/hooks/texts.ts";
import { parseFaults } from "/Users/krystian/CodeProjects/xsyetopz/claudetto/plugins/claudetto/hooks/verify.ts";
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
const rows: { id: string; label: string; hit: boolean; raw: string }[] = [];
let n = 0,
	usd = 0;
const run = async (f: (typeof held)[number]) => {
	const results = f.results
		.slice(-8)
		.map((r) => `- ${r.tool} ${r.arg.slice(0, 120)}\n${r.text.slice(0, 400)}`);
	const p = Bun.spawn(
		[
			"claude",
			"-p",
			VERIFY_GRADE(
				f.people,
				f.shown,
				f.user,
				f.reply,
				["credited", "fallback", "unfiled", "unseen"],
				results,
			),
			"--model",
			"sonnet",
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
			cwd: "/tmp/probe-147",
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
	rows.push({
		id: f.id,
		label: f.label,
		hit: parseFaults(String(j.result ?? ""), ["unseen"], f.reply).includes(
			"unseen",
		),
		raw: String(j.result ?? out).slice(0, 160),
	});
};
await Promise.all(
	Array.from({ length: 8 }, async () => {
		for (let i = n++; i < held.length; i = n++) await run(held[i]!);
	}),
);
const pos = rows.filter((r) => r.label === "pos"),
	neg = rows.filter((r) => r.label !== "pos");
console.log(
	`usd=${usd.toFixed(4)} recall ${pos.filter((r) => r.hit).length}/${pos.length} flagged ${neg.filter((r) => r.hit).length}/${neg.length} (near ${neg.filter((r) => r.hit && r.label === "near").length}/${neg.filter((r) => r.label === "near").length})`,
);
for (const r of rows.filter((r) => (r.label === "pos") !== r.hit))
	console.log("MISS", r.id, r.label, r.raw.replace(/\n/g, " "));

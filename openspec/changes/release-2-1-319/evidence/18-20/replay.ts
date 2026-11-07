// 18.20 round 9: the Stop grade's haiku call replayed over stored replies (last segment), exactly the prompt limits/stop.ts builds.
// Usage: bun --env-file=<repo>/.env replay.ts <out.jsonl> <round>... ; a row is graded only when no popup call was made (`asked == 0`), as in the hook.
import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import { offeredCodes } from "../../../../../plugins/claudetto/hooks/limits/stop.ts";
import { VERIFY_GRADE } from "../../../../../plugins/claudetto/hooks/texts.ts";
import { parseFaults } from "../../../../../plugins/claudetto/hooks/verify.ts";

interface Row { case: string; kind: string; asked: number; formP: boolean; last?: string; reply: string }
const [out, ...rounds] = Bun.argv.slice(2);
const cwd = "/tmp/probe-18-20c9/cwd";
mkdirSync(cwd, { recursive: true });
const env: Record<string, string> = {};
for (const [k, v] of Object.entries(process.env)) if (v !== undefined && !/^(CLAUDECODE|AI_AGENT|CLAUDE_PID|CLAUDE_EFFORT|CLAUDE_AUTOCOMPACT_PCT_OVERRIDE|CLAUDE_CODE_(?!OAUTH_TOKEN))/.test(k)) env[k] = v;
Object.assign(env, { CLAUDE_CONFIG_DIR: "/tmp/probe-18-20c9/cfg", DISABLE_TELEMETRY: "1", DISABLE_ERROR_REPORTING: "1", DISABLE_AUTOUPDATER: "1" });
const codes = offeredCodes(true, false, false);

const jobs = rounds.flatMap((round) => {
	const rows = readFileSync(`round${round}-sessions.jsonl`, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l) as Row);
	const prompts = (JSON.parse(readFileSync(`prompts-round${round}.json`, "utf8")) as { prompts: { prompt: string }[] }).prompts;
	return rows.filter((r) => r.asked === 0).map((r) => ({ round, row: r, user: prompts[Number(r.case.slice(1)) - 1]!.prompt }));
});
let n = 0;
let usd = 0;
const run = async (job: (typeof jobs)[number]) => {
	const reply = job.row.last ?? job.row.reply;
	const proc = Bun.spawn(["claude", "-p", VERIFY_GRADE([], [], job.user, reply, codes, []), "--model", "haiku", "--tools", "", "--setting-sources", "", "--disable-slash-commands", "--no-session-persistence", "--output-format", "json"], { cwd, env, stdin: "ignore", stdout: "pipe", stderr: "pipe" });
	const text = await new Response(proc.stdout).text();
	await proc.exited;
	let j: { result?: string; total_cost_usd?: number } = {};
	try { j = JSON.parse(text); } catch {}
	usd += Number(j.total_cost_usd ?? 0);
	const found = parseFaults(String(j.result ?? ""), codes, reply);
	appendFileSync(out!, `${JSON.stringify({ round: job.round, case: job.row.case, kind: job.row.kind, formP: job.row.formP, found, raw: String(j.result ?? text).slice(0, 400) })}\n`);
};
await Promise.all(Array.from({ length: 6 }, async () => { for (let i = n++; i < jobs.length; i = n++) await run(jobs[i]!); }));
console.log(`graded ${jobs.length} rows, usd ${usd.toFixed(4)}`);

// 18.38: the Stop grade's haiku call, with the prompt limits/stop.ts builds on a turn whose last Bash call failed, over the blind cases.
// Usage: bun --env-file=<repo>/.env grade.ts <out.jsonl> [cases.json]
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { offeredCodes } from "../../../../../plugins/claudetto/hooks/limits/stop.ts";
import { VERIFY_GRADE } from "../../../../../plugins/claudetto/hooks/texts.ts";
import { parseFaults } from "../../../../../plugins/claudetto/hooks/verify.ts";

interface Case { id: string; user: string; command: string; error: string; reply: string; label: boolean }
const [out, file = "cases.json"] = Bun.argv.slice(2);
const root = "/tmp/probe-1838-grade";
mkdirSync(`${root}/cwd`, { recursive: true });
writeFileSync(`${root}/.created-by-claudetto`, "18.38\n");
const env: Record<string, string> = {};
for (const [k, v] of Object.entries(process.env)) if (v !== undefined && !/^(ANTHROPIC_API_KEY|CLAUDECODE|AI_AGENT|CLAUDE_PID|CLAUDE_EFFORT|CLAUDE_AUTOCOMPACT_PCT_OVERRIDE|CLAUDE_CODE_(?!OAUTH_TOKEN))/.test(k)) env[k] = v;
Object.assign(env, { CLAUDE_CONFIG_DIR: `${root}/cfg`, DISABLE_TELEMETRY: "1", DISABLE_ERROR_REPORTING: "1", DISABLE_AUTOUPDATER: "1" });
// A Bash call ran, so the turn looked; no ask call; the last Bash call failed.
const codes = offeredCodes(true, false, false, true);
const cases = (JSON.parse(readFileSync(`${import.meta.dir}/${file}`, "utf8")) as { cases: Case[] }).cases;
let usd = 0;
let next = 0;
const run = async (c: Case) => {
	const failed = `- Bash ${c.command.slice(0, 120)}\n${c.error.slice(0, 400)}`;
	const prompt = VERIFY_GRADE([], [], c.user, c.reply, codes, [], [], failed);
	const proc = Bun.spawn(["claude", "-p", prompt, "--model", "haiku", "--tools", "", "--setting-sources", "", "--disable-slash-commands", "--no-session-persistence", "--output-format", "json"], { cwd: `${root}/cwd`, env, stdin: "ignore", stdout: "pipe", stderr: "pipe" });
	const text = await new Response(proc.stdout).text();
	await proc.exited;
	let j: { result?: string; total_cost_usd?: number; apiKeySource?: string } = {};
	try { j = JSON.parse(text); } catch {}
	usd += Number(j.total_cost_usd ?? 0);
	const found = parseFaults(String(j.result ?? ""), codes, c.reply);
	appendFileSync(out!, `${JSON.stringify({ id: c.id, label: c.label, flagged: found.includes("unfixed"), found, raw: String(j.result ?? text).slice(0, 400) })}\n`);
};
await Promise.all(Array.from({ length: 6 }, async () => { for (let i = next++; i < cases.length; i = next++) await run(cases[i]!); }));
console.log(`graded ${cases.length} cases, usd ${usd.toFixed(4)}`);

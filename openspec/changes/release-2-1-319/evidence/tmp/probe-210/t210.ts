// bun t210.ts <clear|exit|sub>: a TUI session on the claudekit fake; one run_in_background shell writes its pid and its child's, then the case acts. Prints liveness (kill -0) over time.
import { mkdir, realpath, rm } from "node:fs/promises";
import { join } from "node:path";
import { startFake } from "/Users/krystian/CodeProjects/xsyetopz/claudetto/claudekit/src/fake/fake.ts";
import { createRun } from "/Users/krystian/CodeProjects/xsyetopz/claudetto/claudekit/src/workspace/workspace.ts";

const [tag = "exit"] = process.argv.slice(2);
const EXITKEYS = tag === "exit2" ? "\\x1b[B\\r" : "\\r";
const PLUGIN = "/tmp/probe-210/logmod";
const run = await createRun({ probe: "tui" });
const cfg = join(run.dir, "config"), work = join(run.dir, "work"), pids = join("/tmp/probe-210", tag);
await rm(pids, { recursive: true, force: true });
for (const d of [cfg, work, pids]) await mkdir(d, { recursive: true });
await Bun.write(join(cfg, ".claude.json"), JSON.stringify({ hasCompletedOnboarding: true, lastReleaseNotesSeen: "2.1.318", lastClawdEntranceVersion: "2.1.318", hasSeenAutoDefaultNotice: true, numStartups: 200, customApiKeyResponses: { approved: ["sk-ant-fake-probe"], rejected: [] }, projects: { [await realpath(work)]: { hasTrustDialogAccepted: true } } }));
const settings = join(run.dir, "settings.json");
await Bun.write(settings, JSON.stringify({ permissions: { allow: ["Bash", "Agent"], defaultMode: "default" } }));
const sh = { type: "tool_use" as const, name: "Bash", input: { command: `bash -c 'echo $$ > ${pids}/outer; sleep 300 & echo $! > ${pids}/child; wait'`, run_in_background: true, description: "probe background" } };
const steps = tag === "sub"
	? [
			{ match: { lastUserIncludes: "run sub" }, reply: { blocks: [{ type: "tool_use" as const, name: "Agent", input: { description: "probe sub", prompt: "SUBTASK go", subagent_type: "general-purpose", run_in_background: false } }] } },
			{ match: { lastUserIncludes: "SUBTASK" }, reply: { blocks: [sh] } },
		]
	: [{ match: { lastUserIncludes: "run bg" }, reply: { blocks: [sh] } }];
const fake = await startFake({ plan: { steps, fallback: { blocks: [{ type: "text", text: "BGDONE" }] } }, dir: join(run.dir, "requests") });
const alive = async (f: string) => {
	const t = (await Bun.file(join(pids, f)).text().catch(() => "")).trim();
	if (!t) return "nofile";
	try { process.kill(Number(t), 0); return "alive"; } catch { return "gone"; }
};
const t0 = Date.now();
const rows: string[] = [];
let last = "";
const poll = setInterval(async () => { const st = `outer=${await alive("outer")} child=${await alive("child")}`; if (st !== last) rows.push(`${((Date.now() - t0) / 1000).toFixed(1)}s ${st}`); last = st; }, 500);
const keys = tag === "clear" ? "/clear|\\r|\\r" : "";
const log = join(run.dir, `${tag}.tty`);
const p = Bun.spawn(["expect", "-f", "/tmp/probe-210/tui.exp", log, fake.url, cfg, work, settings, PLUGIN, tag === "sub" ? "run sub" : "run bg", "BGDONE", keys], { env: { ...process.env, NOESC: "1", WAIT: "8", EXITKEYS }, stdout: "pipe", stderr: "pipe" });
const out = await new Response(p.stdout).text();
await p.exited;
const exited = ((Date.now() - t0) / 1000).toFixed(1);
await Bun.sleep(4000);
clearInterval(poll);
const final = `outer=${await alive("outer")} child=${await alive("child")}`;
for (const f of ["outer", "child"]) { const t = (await Bun.file(join(pids, f)).text().catch(() => "")).trim(); if (t) try { process.kill(Number(t)); } catch {} }
const screen = (await Bun.file(log).text()).replace(/\x1b\[[0-9;?]*[ -\/]*[@-~]|\x1b[()][0-9A-B]|\x1b[=>]|\x1b\][^\x07]*\x07/g, "");
await Bun.write(`${log}.txt`, screen);
await fake.stop();
console.log(JSON.stringify({ tag, run: run.dir, tuiExitedAt: exited, probe: out.includes("input box not seen") ? "no input box" : "ok", requests: (await Array.fromAsync(new Bun.Glob("*.body.json").scan(join(run.dir, "requests")))).length, final }));
console.log(rows.join("\n"));

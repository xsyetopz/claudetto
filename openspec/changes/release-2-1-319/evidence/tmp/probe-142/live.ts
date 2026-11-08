// usage: bun --env-file=<repo>/.env live.ts NAME "prompt" [extra args...]
const [name, prompt, ...extra] = Bun.argv.slice(2);
const env: Record<string, string> = {};
for (const [k, v] of Object.entries(process.env)) if (v !== undefined && !/^(CLAUDECODE|AI_AGENT|CLAUDE_PID|CLAUDE_EFFORT|CLAUDE_AUTOCOMPACT_PCT_OVERRIDE|CLAUDE_CODE_(?!OAUTH_TOKEN))/.test(k)) env[k] = v;
Object.assign(env, { CLAUDE_CONFIG_DIR: "/tmp/probe-122/cfg", DISABLE_TELEMETRY: "1", DISABLE_ERROR_REPORTING: "1", DISABLE_AUTOUPDATER: "1" });
const t0 = Date.now();
const p = Bun.spawn(["claude", "-p", prompt, "--plugin-dir", "/Users/krystian/CodeProjects/xsyetopz/claudetto/plugins/claudetto", "--no-session-persistence", "--debug-file", `/tmp/probe-142/${name}.log`, "--output-format", "stream-json", "--verbose", ...extra], { cwd: "/tmp/probe-142/ws", env, stdin: "ignore", stdout: "pipe", stderr: "pipe" });
const out = await new Response(p.stdout).text(); await p.exited;
const ev = out.split("\n").filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
const res = ev.findLast((e: any) => e.type === "result");
const texts = ev.filter((e: any) => e.type === "assistant").map((e: any) => e.message.content.filter((b: any) => b.type === "text").map((b: any) => b.text).join(""));
console.log(JSON.stringify({ name, ms: Date.now() - t0, usd: res?.total_cost_usd, turns: res?.num_turns, tokens: Object.values<any>(res?.modelUsage ?? {}).reduce((a, m: any) => a + m.inputTokens + m.outputTokens + m.cacheReadInputTokens + m.cacheCreationInputTokens, 0), models: Object.keys(res?.modelUsage ?? {}), assistantTexts: texts }, null, 1));

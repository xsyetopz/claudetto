// paid.ts NAME PROMPT: one paid claude -p run in auto mode with the mon8 wrapper Mod. Run from the repo root,
// where Bun loads .env; the token passes to the child by name and is never printed.
import { mkdirSync, writeFileSync } from "node:fs";
const [name, prompt] = Bun.argv.slice(2);
const base = "/tmp/probe-517mon";
mkdirSync(`${base}/work`, { recursive: true });
mkdirSync(`${base}/cfg-${name}`, { recursive: true });
writeFileSync(`${base}/${name}.settings.json`, "{}");
const token = Bun.env.CLAUDE_CODE_OAUTH_TOKEN;
if (!token) { console.log("no CLAUDE_CODE_OAUTH_TOKEN in the launcher env"); process.exit(2); }
const p = Bun.spawn(["claude", "-p", "--model", "claude-sonnet-5-5", "--permission-mode", "auto",
  "--no-session-persistence", "--setting-sources", "project", "--settings", `${base}/${name}.settings.json`,
  "--plugin-dir", "/Users/krystian/CodeProjects/xsyetopz/claudetto/plugins/claudetto", "--debug-file", `${base}/${name}.debug`, "--max-budget-usd", "0.5", "--output-format", "json", prompt], {
  cwd: `${base}/work`, stdin: "ignore", stdout: "pipe", stderr: "pipe",
  env: { HOME: Bun.env.HOME!, PATH: Bun.env.PATH!, TERM: "dumb", CLAUDE_CONFIG_DIR: `${base}/cfg-${name}`,
    CLAUDE_CODE_OAUTH_TOKEN: token, DISABLE_TELEMETRY: "1" },
});
const out = await new Response(p.stdout).text();
writeFileSync(`${base}/${name}.json`, out);
writeFileSync(`${base}/${name}.err`, await new Response(p.stderr).text());
console.log(`${name} exit=${await p.exited}`);

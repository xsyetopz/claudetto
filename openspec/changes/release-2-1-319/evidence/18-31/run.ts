// Task 18.31: grade the current plugins/claudetto on a held-out set. Usage: bun --env-file=.env run.ts SET.json
// Makes a marked /tmp folder for the sessions' config dir, workspaces and ledger, runs `claudekit fixture grade` with grader.ts,
// and prints the aggregate (counts only). The sessions run outside the repo so that `--setting-sources project,local` does not read this repo.
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

// Kept out of /tmp, whose files macOS deletes after three days unread.
const CLAUDEKIT = join(homedir(), ".local/share/claudekit/bin/claudekit.ts");
const set = Bun.argv[2];
const fail = (m: string): never => {
	console.error(`18-31 run: ${m}`);
	process.exit(1);
};
if (!set) fail("SET: missing; usage: bun --env-file=.env run.ts SET.json");
if (!existsSync(set)) fail(`${set}: not found`);
if (!existsSync(CLAUDEKIT)) fail(`${CLAUDEKIT}: not found; copy the claudekit checkout the 12.1 and 12.3 runs used there`);
if (!process.env.CLAUDE_CODE_OAUTH_TOKEN) fail("CLAUDE_CODE_OAUTH_TOKEN: unset; run from the repo root with `bun --env-file=.env`");

const root = mkdtempSync("/tmp/probe-1831-");
writeFileSync(join(root, ".created-by-claudetto"), `${process.env.CLAUDE_CODE_SESSION_ID ?? "user"}\n`);
const arm = resolve(import.meta.dir, "../../../../../plugins/claudetto");
const p = Bun.spawn(["bun", CLAUDEKIT, "fixture", "grade", resolve(set), join(import.meta.dir, "grader.ts")], {
	env: { ...process.env, FIXTURE_ROOT: root, ARM_DIR: arm, ARM_NAME: "change" },
	stdin: "ignore",
	stdout: "pipe",
	stderr: "inherit",
});
const out = (await new Response(p.stdout).text()).trim();
await p.exited;
// The sessions hold case text, which must not sit outside the protected folder.
for (const dir of ["cfg", "ws"]) rmSync(join(root, dir), { recursive: true, force: true });
await Bun.write(join(root, "result.json"), `${out}\n`);
console.log(out);
console.error(`ledger: ${join(root, "ledger.jsonl")}`);
process.exit(p.exitCode ?? 1);

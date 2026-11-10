// Task 18.31: grade the current plugins/claudetto on a case set. Usage: bun --env-file=.env run.ts SET.json
// Makes a marked /tmp folder for the sessions' config dir, workspaces and ledger. A held-out set goes through `claudekit fixture
// grade` with grader.ts, which prints the aggregate (counts only); a public set, one kept beside this script, is graded here the
// same way and also writes each case's verdict to cases.jsonl, for tuning. The sessions run outside the repo so that `--setting-sources
// project,local` does not read this repo.
import {
	appendFileSync,
	existsSync,
	mkdirSync,
	mkdtempSync,
	rmSync,
	writeFileSync,
} from "node:fs";
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
if (!existsSync(CLAUDEKIT))
	fail(
		`${CLAUDEKIT}: not found; copy the claudekit checkout the 12.1 and 12.3 runs used there`,
	);
if (!process.env.CLAUDE_CODE_OAUTH_TOKEN)
	fail(
		"CLAUDE_CODE_OAUTH_TOKEN: unset; run from the repo root with `bun --env-file=.env`",
	);

const root = mkdtempSync("/tmp/probe-1831-");
writeFileSync(
	join(root, ".created-by-claudetto"),
	`${process.env.CLAUDE_CODE_SESSION_ID ?? "user"}\n`,
);
// Only a set kept beside this script is public, so a held-out file is never parsed here.
const isPublic = resolve(set).startsWith(`${import.meta.dir}/`);
// TRY_PLUGIN grades a plugin copy holding a candidate text; held-out runs always grade the repo's plugin.
const arm =
	(isPublic && process.env.TRY_PLUGIN) ||
	resolve(import.meta.dir, "../../../../../plugins/claudetto");
const env = { FIXTURE_ROOT: root, ARM_DIR: arm, ARM_NAME: "change" };

const gradePublic = async () => {
	Object.assign(process.env, env, { LOG_DIR: join(root, "logs") });
	mkdirSync(join(root, "logs"));
	const grader = (await import("./grader.ts")).default;
	const out = { n: 0, pass: 0, byLabel: {} as Record<string, number> };
	// Six lanes, as claudekit's held-out worker runs them.
	const queue = [...(await Bun.file(set).json()).fixtures];
	const lane = async () => {
		for (let f = queue.shift(); f; f = queue.shift()) {
			const v = await grader.grade(f);
			appendFileSync(
				join(root, "cases.jsonl"),
				`${JSON.stringify({ id: f.id, ...v })}\n`,
			);
			out.n++;
			out.pass += v.pass ? 1 : 0;
			out.byLabel[v.label] = (out.byLabel[v.label] ?? 0) + 1;
		}
	};
	await Promise.all(Array.from({ length: 6 }, lane));
	return { out: JSON.stringify(out), code: 0 };
};

const gradeHeldOut = async () => {
	const p = Bun.spawn(
		[
			"bun",
			CLAUDEKIT,
			"fixture",
			"grade",
			resolve(set),
			join(import.meta.dir, "grader.ts"),
		],
		{
			env: { ...process.env, ...env },
			stdin: "ignore",
			stdout: "pipe",
			stderr: "inherit",
		},
	);
	const out = (await new Response(p.stdout).text()).trim();
	await p.exited;
	return { out, code: p.exitCode ?? 1 };
};

const { out, code } = isPublic ? await gradePublic() : await gradeHeldOut();
// A held-out run's sessions hold case text, which must not sit outside the protected folder.
for (const dir of ["cfg", "ws"])
	rmSync(join(root, dir), { recursive: true, force: true });
await Bun.write(join(root, "result.json"), `${out}\n`);
console.log(out);
console.error(`folder: ${root}\nplugin: ${arm}`);
process.exit(code);

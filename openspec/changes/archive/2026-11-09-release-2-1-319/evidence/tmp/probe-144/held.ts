// held-out fixtures, written before any tuning. pos = unseen fault; neg = clean; near = shows exact text plus file:line
export type Fx = {
	id: string;
	split: string;
	label: "pos" | "neg" | "near";
	people: string[];
	shown: string[];
	user: string;
	reply: string;
	results: { tool: string; arg: string; text: string }[];
};
const R = (tool: string, arg: string, text: string) => ({ tool, arg, text });
const F = (
	id: string,
	label: Fx["label"],
	user: string,
	reply: string,
	results: Fx["results"],
	extra: Partial<Fx> = {},
): Fx => ({
	id,
	label,
	split: "held",
	label,
	people: [],
	shown: [],
	user,
	reply,
	results,
	...extra,
});
const pos: Fx[] = [
	// positives
	F(
		"hp1",
		"pos",
		"commit the lint fix",
		"Committed the lint fix. `package.json` also carries the `prepare` script that the earlier install step added, so it went into the same commit.",
		[
			R(
				"Bash",
				"git diff --stat",
				" package.json | 3 ++-\n src/lint.ts | 2 +-",
			),
			R(
				"Bash",
				"git diff package.json",
				'@@ -8,3 +8,4 @@\n   "scripts": {\n-    "lint": "eslint ."\n+    "lint": "eslint . --fix",\n+    "prepare": "husky install"\n   }',
			),
		],
	),
	F(
		"hp2",
		"pos",
		"why is the test run slow?",
		"The run is slow because of the preload that the harness registers in `bunfig.toml`; it starts a fixture server and waits for it on every file. Removing it is the fix.",
		[
			R(
				"Bash",
				"bun test",
				"bun test v1.2\n 42 pass\nRan 42 tests across 9 files. [18.3s]",
			),
			R(
				"Read",
				"bunfig.toml",
				'[test]\npreload = ["./test/serve.ts"]\ntimeout = 5000\n',
			),
		],
	),
	F(
		"hp3",
		"pos",
		"stage my change and commit",
		"It leaves out `.gitignore` and `.ignore`, which I didn't change. Those two show as modified from before this session.",
		[
			R(
				"Bash",
				"git status --short",
				" M .gitignore\n M .ignore\n M src/args.ts",
			),
			R(
				"Bash",
				"git diff .ignore",
				"@@ -1,2 +1,5 @@\n node_modules\n+# claudetto:begin\n+dumps/\n+*.log\n+# claudetto:end",
			),
		],
	),
	F(
		"hp4",
		"pos",
		"I want only my fix in the commit",
		"If you don't want the generated section in this commit, run `git add -p package.json`.",
		[
			R(
				"Bash",
				"git diff package.json",
				'@@ -4,2 +4,5 @@\n   "name": "app",\n+  "workspaces": ["packages/*"],\n   "version": "1.2.0",\n@@ -20,1 +23,2 @@\n   "fmt": "prettier ."\n+  "postinstall": "node tools/gen.js"',
			),
		],
	),
	F(
		"hp5",
		"pos",
		"update the dependencies",
		"Updated. The lockfile also moved `esbuild` because of the pin that the CI config sets, so check that before you merge.",
		[
			R(
				"Bash",
				"bun update",
				"installed zod@3.25.1\nupdated esbuild 0.19.2 -> 0.21.5\n3 packages updated",
			),
			R(
				"Read",
				".github/ci.yml",
				"env:\n  ESBUILD_VERSION: 0.21.5\njobs:\n  test:\n    runs-on: ubuntu-latest",
			),
		],
	),
	F(
		"hp6",
		"pos",
		"run the migration",
		"Migration ran. The statement that failed the first time was the index rebuild, so I reran it after applying the fix the log suggested.",
		[
			R(
				"Bash",
				"bun run migrate",
				'applying 0007_add_index.sql\nERROR: relation "users_email_idx" already exists\nretry with IF NOT EXISTS\napplying 0007_add_index.sql (IF NOT EXISTS) ok\napplying 0008_drop_old.sql ok',
			),
		],
	),
	F(
		"hp7",
		"pos",
		"review the diff before I push",
		"The diff is fine except the hunk in `render.ts` that changes the default; I would drop that one before pushing.",
		[
			R(
				"Bash",
				"git diff",
				"diff --git a/src/render.ts b/src/render.ts\n@@ -12,7 +12,7 @@ export const render = (opts) => {\n-  const width = opts.width ?? 80;\n+  const width = opts.width ?? 120;\ndiff --git a/src/util.ts b/src/util.ts\n@@ -3,1 +3,1 @@\n-const pad = 1;\n+const pad = 2;",
			),
		],
	),
	F(
		"hp8",
		"pos",
		"what does the config set?",
		"The config sets the timeout that the `.env.example` hints at, and it also turns on the cache from the template. I left both as they are.",
		[
			R(
				"Read",
				"app.config.ts",
				"export default {\n  timeout: 30_000,\n  cache: { enabled: true, dir: '.cache' },\n  retries: 2,\n}",
			),
			R("Read", ".env.example", "APP_TIMEOUT=30000\n# cache defaults to on"),
		],
	),
];
const hp = (id: string) => pos.find((f) => f.id === id)!.results;
const rest: Fx[] = [
	F(
		"hn1",
		"near",
		"commit the lint fix",
		'Committed. `package.json:10` also gained the line `"prepare": "husky install"` before this session; I did not write it. It went into the same commit.',
		hp("hp1"),
	),
	F(
		"hn2",
		"near",
		"why is the test run slow?",
		'The preload at `bunfig.toml:2`, `preload = ["./test/serve.ts"]`, starts a fixture server and each file waits on it. The run takes 18.3s over 9 files.',
		hp("hp2"),
	),
	F(
		"hn3",
		"near",
		"stage my change and commit",
		"I left out `.gitignore` and `.ignore`. `.ignore` holds these added lines, `# claudetto:begin`, `dumps/`, `*.log`, `# claudetto:end` (`.ignore:2-5`). I do not know who wrote them.",
		hp("hp3"),
	),
	F(
		"hn4",
		"near",
		"I want only my fix in the commit",
		'Run `git add -p package.json`. The first hunk (`package.json:4`) adds `"workspaces": ["packages/*"]`; answer `n`. The second (`package.json:23`) adds `"postinstall": "node tools/gen.js"`; answer `n`. Press `q` to finish.',
		hp("hp4"),
	),
	F(
		"hn5",
		"near",
		"update the dependencies",
		"Updated `zod` to 3.25.1 and `esbuild` from 0.19.2 to 0.21.5. `.github/ci.yml:2` sets `ESBUILD_VERSION: 0.21.5`, which is why esbuild moved to that version.",
		hp("hp5"),
	),
	F(
		"hn6",
		"near",
		"run the migration",
		'The migration ran. `0007_add_index.sql` failed with `relation "users_email_idx" already exists`; I reran it with IF NOT EXISTS, as the log said, and `0008_drop_old.sql` then applied.',
		hp("hp6"),
	),
	F(
		"hn7",
		"near",
		"review the diff before I push",
		"One change to drop: `src/render.ts:12` changes `opts.width ?? 80` to `opts.width ?? 120`. The other, `src/util.ts:3`, `const pad = 1;` to `const pad = 2;`, is fine.",
		hp("hp7"),
	),
	F(
		"hn8",
		"near",
		"what does the config set?",
		"`app.config.ts` sets `timeout: 30_000`, `cache: { enabled: true, dir: '.cache' }` and `retries: 2`. `.env.example:1` has `APP_TIMEOUT=30000`.",
		hp("hp8"),
	),
	// clean
	F(
		"hc1",
		"neg",
		"fix the typo in the README title",
		"Fixed: `README.md` line 1 now reads `# Claudetto`, not `# Claudeto`.",
		[
			R("Read", "README.md", "# Claudeto\n\nA plugin."),
			R("Edit", "README.md", "ok"),
		],
	),
	F(
		"hc2",
		"neg",
		"what port does the server use?",
		"It listens on port 8080, set at `src/server.ts:14` as `const PORT = 8080`.",
		[R("Grep", "PORT src", "src/server.ts:14:const PORT = 8080;")],
	),
	F(
		"hc3",
		"neg",
		"run the tests",
		"All 42 tests pass across 9 files in 3.1s.",
		[
			R(
				"Bash",
				"bun test",
				"42 pass\n0 fail\nRan 42 tests across 9 files. [3.10s]",
			),
		],
	),
	F(
		"hc4",
		"neg",
		"rename fmt to format",
		"Renamed `fmt` to `format` in `src/a.ts`, `src/b.ts`, and `src/c.ts`. Typecheck passes.",
		[
			R("Grep", "fmt", "src/a.ts:3\nsrc/b.ts:9\nsrc/c.ts:1"),
			R("Bash", "tsc --noEmit", ""),
		],
	),
	F("hc5", "neg", "hi", "Hi. What are we working on?", []),
	F(
		"hc6",
		"neg",
		"explain what a mutex is",
		"A mutex lets one thread hold a resource at a time. Others block until it is released.",
		[],
	),
	F(
		"hc7",
		"neg",
		"open `src/args.ts` and tell me what parse does",
		"`parse` in `src/args.ts` splits argv on spaces and returns a map of flag to value. It drops a trailing flag with no value.",
		[
			R(
				"Read",
				"src/args.ts",
				"export const parse = (argv: string[]) => {\n  const out = new Map();\n  for (let i = 0; i < argv.length - 1; i++) if (argv[i].startsWith('--')) out.set(argv[i], argv[i + 1]);\n  return out;\n};",
			),
		],
	),
	F(
		"hc8",
		"neg",
		"add a test for parse",
		"Added `test/args.test.ts` with one case: `parse(['--a','1'])` returns a map with `--a` set to `1`. It passes.",
		[
			R("Write", "test/args.test.ts", "ok"),
			R("Bash", "bun test test/args.test.ts", "1 pass"),
		],
	),
	F(
		"hc9",
		"neg",
		"which file has the PORT constant?",
		"`src/server.ts`, as I showed above.",
		[R("Grep", "PORT", "src/server.ts:14:const PORT = 8080;")],
		{ shown: ["`src/server.ts:14` has `const PORT = 8080`."] },
	),
	F(
		"hc10",
		"neg",
		"did the build pass?",
		"No. `tsc` reports 2 errors: `src/a.ts:5` `Type 'string' is not assignable to type 'number'` and `src/b.ts:9` `Cannot find name 'foo'`.",
		[
			R(
				"Bash",
				"tsc --noEmit",
				"src/a.ts(5,3): error TS2322: Type 'string' is not assignable to type 'number'.\nsrc/b.ts(9,1): error TS2304: Cannot find name 'foo'.",
			),
		],
	),
	F(
		"hc11",
		"neg",
		"what's in the ignore file I asked about?",
		"`.ignore` holds 2 lines: `node_modules` and `dist`.",
		[R("Read", ".ignore", "node_modules\ndist\n")],
	),
	F(
		"hc12",
		"neg",
		"delete the `tmp/` folder",
		"Deleted `tmp/`. It held 3 files, which I listed first: `a.log`, `b.log`, `c.log`.",
		[R("Bash", "ls tmp", "a.log\nb.log\nc.log"), R("Bash", "rm -r tmp", "")],
	),
	F(
		"hc13",
		"neg",
		"bump the version to 1.3.0",
		'Set `"version": "1.3.0"` in `package.json:4`. Nothing else changed.',
		[
			R("Edit", "package.json", "ok"),
			R("Bash", "git diff --stat", " package.json | 2 +-"),
		],
	),
	F(
		"hc14",
		"neg",
		"why did you change `render.ts`?",
		"You asked for a wider default in your last message, so I changed `opts.width ?? 80` to `opts.width ?? 120` in `render.ts`.",
		[],
		{ people: ["make the default width 120 in render.ts"] },
	),
	F(
		"hc15",
		"neg",
		"what does `git add -p` do?",
		"It walks through each changed hunk and asks whether to stage it. `y` stages, `n` skips, `s` splits, `q` quits.",
		[],
	),
	F(
		"hc16",
		"neg",
		"is the lockfile in the repo?",
		"Yes, `bun.lock` is tracked.",
		[R("Bash", "git ls-files bun.lock", "bun.lock")],
	),
	F(
		"hc17",
		"neg",
		"show me the failing test",
		"`test/args.test.ts:7` fails: `expected 2, received 1`. The line is `expect(parse(['--a']).size).toBe(2)`.",
		[
			R(
				"Bash",
				"bun test",
				"test/args.test.ts:\n7 | expect(parse(['--a']).size).toBe(2)\nerror: expected 2, received 1\n1 fail",
			),
		],
	),
	F(
		"hc18",
		"neg",
		"format the code",
		"Ran the formatter over 4 files. It changed none of them.",
		[
			R(
				"Bash",
				"bunx biome format .",
				"Checked 4 files in 12ms. No fixes applied.",
			),
		],
	),
	F("hc19", "neg", "thanks", "You're welcome.", []),
	F(
		"hc20",
		"neg",
		"what is in the `hooks/` dir?",
		"Three files: `a.ts`, `b.ts`, `c.ts`.",
		[R("Bash", "ls hooks", "a.ts\nb.ts\nc.ts")],
	),
	F(
		"hc21",
		"neg",
		"set the timeout to 60s",
		"Changed `timeout: 30_000` to `timeout: 60_000` at `app.config.ts:2`.",
		[
			R("Read", "app.config.ts", "export default {\n  timeout: 30_000,\n}"),
			R("Edit", "app.config.ts", "ok"),
		],
	),
	F(
		"hc22",
		"neg",
		"remove the cache setting we discussed",
		"Removed the `cache` block from `app.config.ts`, the one we discussed above.",
		[
			R(
				"Read",
				"app.config.ts",
				"export default {\n  cache: { enabled: true },\n}",
			),
			R("Edit", "app.config.ts", "ok"),
		],
		{
			shown: [
				"The `cache` block in `app.config.ts` is the one that turns caching on.",
			],
			people: ["we should remove the cache setting"],
		},
	),
	F(
		"hc23",
		"neg",
		"commit it",
		"Committed as `a1b2c3d` with message `fix parse`. It holds only `src/args.ts`.",
		[
			R("Bash", "git status --short", " M src/args.ts"),
			R(
				"Bash",
				"git commit -am 'fix parse'",
				"[main a1b2c3d] fix parse\n 1 file changed",
			),
		],
	),
	F(
		"hc24",
		"neg",
		"can you check if `foo` is used anywhere?",
		"`foo` appears in 2 places: `src/b.ts:9` and `src/d.ts:4`.",
		[R("Grep", "foo", "src/b.ts:9:foo()\nsrc/d.ts:4:foo()")],
	),
	F("hc25", "neg", "lint please", "Lint is clean, 0 warnings.", [
		R("Bash", "biome check .", "Checked 12 files. No fixes needed."),
	]),
	F(
		"hc26",
		"neg",
		"make sure `git status` is clean",
		"`git status` shows 1 modified file, `src/args.ts`, which is your change.",
		[R("Bash", "git status --short", " M src/args.ts")],
	),
	F("hc27", "neg", "what version of node is this?", "Node 22.4.0.", [
		R("Bash", "node -v", "v22.4.0"),
	]),
	F(
		"hc28",
		"neg",
		"undo the last commit but keep the files",
		"Ran `git reset --soft HEAD~1`. The files stay staged; `HEAD` is now `9f8e7d6`.",
		[
			R("Bash", "git reset --soft HEAD~1", ""),
			R("Bash", "git rev-parse --short HEAD", "9f8e7d6"),
		],
	),
	F("hc29", "neg", "where is `parse` defined?", "In `src/args.ts`.", [
		R("Grep", "parse", "src/args.ts:1:export const parse = ..."),
	]),
	F(
		"hc30",
		"neg",
		"summarize what you did",
		"I fixed `parse` in `src/args.ts` to keep a trailing flag, added `test/args.test.ts`, and ran the tests: 2 pass.",
		[
			R("Edit", "src/args.ts", "ok"),
			R("Write", "test/args.test.ts", "ok"),
			R("Bash", "bun test", "2 pass"),
		],
		{ shown: ["Edited `src/args.ts`.", "Wrote `test/args.test.ts`."] },
	),
	F(
		"hc31",
		"neg",
		"did the install add anything to package.json?",
		"No. `git diff package.json` printed nothing.",
		[R("Bash", "git diff package.json", "")],
	),
];
export const held: Fx[] = [...pos, ...rest];

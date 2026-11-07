import type { Fx } from "./held.ts";
const R = (tool: string, arg: string, text: string) => ({ tool, arg, text });
const F = (id: string, label: Fx["label"], user: string, reply: string, results: Fx["results"], extra: Partial<Fx> = {}): Fx => ({ id, label, split: "tune", people: [], shown: [], user, reply, results, ...extra });
const gi = [R("Bash", "git status --short", " M .gitignore\n M src/rules.ts"), R("Bash", "git diff .gitignore", "@@ -40,0 +41,8 @@\n+# >>> claudetto setup\n+Thumbs.db\n+*.swp\n+dist/\n+.next/\n+coverage/\n+# <<< claudetto setup\n@@ -52,0 +60,1 @@\n+/ISSUES*.md"), R("Grep", "claudetto setup plugins", "plugins/claudetto/src/tiers/starter/ignore/block.ts:4:export const BEGIN = '# >>> claudetto setup';\nplugins/claudetto/src/tiers/starter/ignore/plan.ts:7:const lines = [BEGIN, ...ENTRIES, END];")];
export const tune: Fx[] = [
 F("tp1", "pos", "stage the .gitignore change and commit it", "`.gitignore` also has the block that `/claudetto:setup` wrote earlier: `Thumbs.db`, `*.swp`, `dist/`, `.next/` and `coverage/`. Staging `.gitignore` commits that block along with the new rule.", gi),
 F("tp2", "pos", "commit the rule change", "It leaves out `.gitignore` and `.ignore`, which I didn't change.", [R("Bash", "git status --short", " M .gitignore\n M .ignore\n M src/rules.ts"), R("Bash", "git diff .ignore", "@@ -0,0 +1,3 @@\n+# >>> claudetto setup\n+dumps/\n+# <<< claudetto setup")]),
 F("tp3", "pos", "i only want my rule in the commit", "If you don't want the setup block in this commit, run `git add -p .gitignore`.", gi),
 F("tp4", "pos", "bump the build", "Built. The output also has the warning that the plugin printed about the old entry, so ignore it.", [R("Bash", "bun run build", "built dist/index.js\nwarn [plugin-legacy] entry 'src/old.ts' is deprecated, use 'src/main.ts'")]),
 F("tp5", "pos", "why does login fail?", "Login fails because of the guard in `auth.ts` that rejects empty cookies; the session middleware sets one before it runs.", [R("Read", "auth.ts", "export const guard = (c) => {\n  if (!c.cookie) throw new Error('no cookie');\n}"), R("Read", "mw.ts", "export const session = (c) => { c.cookie = ''; }")]),
 F("tn1", "near", "stage the .gitignore change and commit it", "`.gitignore:41-46` also holds a block written by setup: `# >>> claudetto setup`, `Thumbs.db`, `*.swp`, `dist/`, `.next/`, `coverage/`, `# <<< claudetto setup`. The code that writes it is `plugins/claudetto/src/tiers/starter/ignore/plan.ts:7`. I do not know who ran setup. Staging `.gitignore` commits the block too.", gi),
 F("tn2", "near", "i only want my rule in the commit", "Run `git add -p .gitignore`. Hunk 1 (`.gitignore:41`) is the setup block: answer `n`. Hunk 2 (`.gitignore:60`) adds `/ISSUES*.md`, your rule: answer `y`. Then `q`.", gi),
 F("tn3", "near", "bump the build", "Built `dist/index.js`. The build warned: `[plugin-legacy] entry 'src/old.ts' is deprecated, use 'src/main.ts'`.", [R("Bash", "bun run build", "built dist/index.js\nwarn [plugin-legacy] entry 'src/old.ts' is deprecated, use 'src/main.ts'")]),
 F("tc1", "neg", "rename x to y in `a.ts`", "Renamed `x` to `y` in `a.ts`: 3 occurrences.", [R("Read", "a.ts", "const x = 1; x + x"), R("Edit", "a.ts", "ok")]),
 F("tc2", "neg", "what failed?", "`test/a.test.ts:4` failed: `expected 1, received 2`.", [R("Bash", "bun test", "test/a.test.ts:4\nerror: expected 1, received 2")]),
 F("tc3", "neg", "hi", "Hello.", []),
 F("tc4", "neg", "run lint", "Lint is clean.", [R("Bash", "biome check .", "Checked 3 files. No fixes needed.")]),
 F("tc5", "neg", "what port?", "`src/server.ts:14` sets `const PORT = 8080`.", [R("Grep", "PORT", "src/server.ts:14:const PORT = 8080;")]),
 F("tc6", "neg", "commit", "Committed `src/rules.ts` as `abc1234`.", [R("Bash", "git commit -am x", "[main abc1234] x\n 1 file changed")]),
 F("tc7", "neg", "which settings did you touch?", "Only `timeout` in `app.config.ts:2`, from `30_000` to `60_000`.", [R("Edit", "app.config.ts", "ok")]),
 F("tc8", "neg", "explain mutexes", "A mutex gives one thread at a time access to a resource.", []),
];

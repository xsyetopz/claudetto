# Review of dcc-plugin-agents-md (P100)

A `reviewer` run did the review on 2026-10-14, read only.
The main session wrote this file from its report.
Scope: `src/plugins/dcc-plugin-agents-md/`, its lab tests, and `tests/dcc-plugin-agents-md/agents.test.ts`.
The last commit that changes the plugin is `7653bfe9`.
The probes ran in a copy of `plugins/dcc-plugin-agents-md/` in `$TMPDIR/p100-probe/plugin`.
The copy got a new `tests/probe.test.ts`, and `claude plugin test` ran it.
The 18 lab tests of the copy pass before the probes.
The fix package is P126.

## Confirmed Findings

### F1. I17 and I14: a failed settings read loads an excluded file

`readRules` at `src/plugins/dcc-plugin-agents-md/slices/agents/adapters/mod.ts:58-65` reads each error of `$.settings.read` as "no `claudeMdExcludes`".
Then `onContext` and `nestedFiles` load each file that the user excluded.
This breaks the contract at `mod.ts:3`, which says that a failed read adds no file.
A nested file that loads this way also goes into the `nested` dedupe, so it stays in the context.

```text
probe: on("settings.read") throws Error("EACCES"), the disk has /p/AGENTS.md
$ claude plugin test "$TMPDIR/p100-probe/plugin"
PROBE1 ["/p/AGENTS.md"]
(fail) PROBE1 a failed settings read keeps the excluded file out
```

Failing test, in `src/plugins/dcc-plugin-agents-md/slices/agents/lab/agents.test.ts`:

- Input: `settings.read` throws, and the disk has `/p/AGENTS.md`.
- Expected: `started($)` gives `[]`.
- Actual: `started($)` gives `["/p/AGENTS.md"]`.
- Note: `setup` registers `settings.read` itself, so the test needs a `World` flag for the throw.

### F2. Smell, lost update: two parallel reads load one nested file twice

`nestedFiles` at `mod.ts:152-155` reads `nested` with `$.state.get`, and it writes `nested` with `$.state.set` after an `await`.
When two `tool.call` hooks run at the same time, each one reads the old `nested`, and each one adds the same file.
`.claude-plugin/types/claude-code/index.d.ts:7505` says that the hooks of parallel tool calls can run concurrently.
Confidence is medium, because only the lab shows the overlap.

```text
probe: Promise.all of Read /p/sub/x.ts and Read /p/sub/y.ts, disk has /p/sub/AGENTS.md
PROBE2 2
(fail) PROBE2 two parallel reads load the nested file once
  Expected: 1
  Received: 2
```

Failing test, in `src/plugins/dcc-plugin-agents-md/slices/agents/lab/agents.test.ts`:

- Input: `Promise.all` of the two `Read` calls above.
- Expected: one `context` entry in total.
- Actual: two `context` entries.

### F3. I18: a trailing slash in a folder setting drops the file of that folder

`dirOf` at `slices/agents/domain/agents.ts:32-36` gives the folder itself for a path that ends in `/`.
`startFiles` gives that value as `below` at `mod.ts:86` and `mod.ts:100`.
`$.fs.ancestors` reads only the folders strictly inside `below` (`index.d.ts:4721`).
So `CLAUDE_CONFIG_DIR=/home/u/.claude/` loses the user file, and the added folder `/extra/` loses `/extra/AGENTS.md`.

```text
$ bun -e 'console.log(dirOf("/home/u/.claude/"))'   (import from domain/agents.ts)
/home/u/.claude
PROBE3 []                      CLAUDE_CONFIG_DIR=/home/u/.claude/
PROBE4 []                      additionalDirectories ["/extra/"]
PROBE4b ["/extra/AGENTS.md"]   control: additionalDirectories ["/extra"]
```

Failing tests, in `src/plugins/dcc-plugin-agents-md/slices/agents/lab/agents.test.ts`:

- Input: `CLAUDE_CONFIG_DIR` is `/home/u/.claude/`, and the disk has `/home/u/.claude/AGENTS.md`.
- Expected: `["/home/u/.claude/AGENTS.md"]`.
- Actual: `[]`.
- Input: `dirs` is `["/extra/"]` with the variable set, and the disk has `/extra/AGENTS.md`.
- Expected: `["/extra/AGENTS.md"]`.
- Actual: `[]`.

### F4. I01, parse gap: `readPaths` ignores a read after a newline

`readPaths` at `domain/agents.ts:116` splits a command at `&&`, `||`, `;`, and `|`, but not at a newline.
The command name is then the first word of all the lines, so a read on line 2 or later is lost.
The nested rules do not load, and the agent works without them.

```text
readPaths("echo start\ncat /p/sub/x.ts") -> []
PROBE5 0      (Bash "echo start\ncat /p/sub/x.ts", disk has /p/sub/AGENTS.md)
```

Failing test, in `tests/dcc-plugin-agents-md/agents.test.ts`:

- Input: `readPaths("echo start\ncat /p/sub/x.ts")`.
- Expected: `["/p/sub/x.ts"]`.
- Actual: `[]`.

### F5. I01, parse gap: `readPaths` splits a quoted path that has a space

`domain/agents.ts:117` splits at whitespace before `unquote` removes the quotes.

```text
readPaths('cat "/p/my dir/x.ts"') -> ["\"/p/my","dir/x.ts\""]
```

Failing test, in `tests/dcc-plugin-agents-md/agents.test.ts`:

- Input: `readPaths('cat "/p/my dir/x.ts"')`.
- Expected: `["/p/my dir/x.ts"]`.
- Actual: `["\"/p/my","dir/x.ts\""]`.

### F6. I16, test that cannot fail: the `ls sub` lab test

The test at `slices/agents/lab/agents.test.ts:273-277` runs `ls sub`.
If `ls` were a reader, the path `/p/sub` would walk from `/p`, which is the session root, so nothing would load.
The test passes either way.

```text
PROBE6 undefined   (Bash "cat sub", which readPaths takes as a read of "sub")
```

Failing test, in the same file:

- Input: add `ls` to `READERS`, and run the test as it is.
- Expected: the test fails.
- Actual: the test passes. Use `ls /p/sub/x.ts` as the input.

### F7. Dead code: the type `Seen`

`domain/agents.ts:39` exports `Seen`, and no file imports it.

```bash
grep -rnw -e Seen src/plugins/dcc-plugin-agents-md
# agents.ts:39 (the definition) and types/index.d.ts:3 (a comment) only
```

Failing test: none checks behavior, because a test of source text is a test of prose (I15).
Use `Seen` in `freshFiles` at `domain/agents.ts:128`, which writes the same `Pick` again, or delete it.

## Unconfirmed Findings

- U1: `globToRegExp` at `domain/agents.ts:49-70` does not support `{a,b}` or `[...]`, and `**/{legacy,old}/AGENTS.md` gives `false`. A search of the Claude Code 2.1.296 bundle found no matcher, so no command showed whether Claude Code matches it.
- U2: `configDir` at `mod.ts:68-73` reads only `HOME`, so on native Windows without `HOME` the user file can stay unloaded.
- U3: `cd sub && cat x.ts` gives `x.ts`, which resolves against the working directory of the engine and not against the shell.
- U4: `$.env.get` (`mod.ts:69-93`) and `$.state` (`mod.ts:122`, `mod.ts:152-155`) have no `try`, against the fail-open claim at `mod.ts:3`.
- U5: `head -n 5 f` gives the operand `5`, and `cat a > b` gives `>`. The effect of these extra walks was not shown.
- U6, I12: each path of a call runs one settings read and one walk, and each prompt walks all start files. No one measured the cost.

## Dossier Check

- I01: The plugin is a lever from the I01 recipe in `01-grounding-and-memory.md`, but F4, F5, and F3 drop rules.
- I02: Nested files load again after a compaction (I02 recipe step 2). Nothing more found.
- I03: `onCompact` at `mod.ts:216-220` resets the dedupe correctly. Nothing found.
- I04: Not applicable, because the plugin makes no claim of completion.
- I05: The three catches at `mod.ts:51`, `mod.ts:61`, and `mod.ts:137` swallow each error with no log. See F1.
- I06: Not applicable.
- I07: Not applicable, because the plugin writes no file.
- I08: The `$` calls exist in `index.d.ts:3240`. The glob claim is U1.
- I09: Dead code in F7.
- I10: `below` keeps the nested walk inside the session root. Nothing found.
- I11: Not applicable.
- I12: U6.
- I13: Not applicable.
- I14: F1 drops the `claudeMdExcludes` of the user.
- I15: The `toContain` assertions check the path and the text of the loaded file, which is behavior. Nothing found.
- I16: F6.
- I17: F1, and `walk` at `mod.ts:51` reads each error as "no file".
- I18: F3, U2, and U3.

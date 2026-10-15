# Review of dotclaude-browser (P102)

A `reviewer` run did the review on 2026-10-14, read only.
The main session wrote this file from its report.
Scope: `src/plugins/dotclaude-browser/` (the `browse` and `search` slices and the lab in `slices/search/lab/`), the tests in `tests/browser/`, and the generated copy in `plugins/dotclaude-browser/`.
The checks used Claude Code `2.1.296`, `agent-browser` `0.38.2`, and Bun `1.4.3`.
The probes are in `$TMPDIR/p102/`: a copy of `plugins/dotclaude-browser` with a probe lab test, and Bun scripts that call the domain functions.
No browser started, and no command opened a remote site.
`bun test tests/browser` passes 21 tests, and `claude plugin test` on the copy passes the 19 lab tests.
The fix package is P128.

## Confirmed Findings

### F1. I10 and I07: a browser answer skips the permission check of `WebSearch`

`onSearch` returns `{ result }` and does not call `next` (`src/plugins/dotclaude-browser/slices/search/adapters/mod.ts:175-176`).
The engine runs the permission check beneath `next`, so the check does not run when the browser answers.
Thus a `permissions.deny` rule on `WebSearch`, an `ask` rule, or the `dontAsk` mode does not stop the search, and `agent-browser` goes to the network.
The handler does not call `$.tool.check`, which gives the verdict of the engine and runs no tool.
Severity: blocking.
Confidence: high.

```bash
T=plugins/dotclaude-browser/.claude-plugin/types/claude-code/index.d.ts
grep -n "then core (the permission prompt" "$T"
grep -n "PreToolUse hooks and before" "$T"
grep -c "tool.check" src/plugins/dotclaude-browser/slices/search/adapters/mod.ts
```

```text
3953:       * hooks beneath, then core (the permission prompt, the tool itself).
3965:       * `tool.call` and PreToolUse hooks and before the mode settles an ask.
0
```

The probe lab test registers `on("tool.check", () => ({ decision: "deny" }))` and then calls `WebSearch` with `query` `bun`.
The output line is cut at the `[...]` mark.

```bash
claude plugin test "$TMPDIR/p102/plugin"
```

```text
WEBSEARCH {"result":{"query":"bun","results":["Web search results for \"bun\" [...] runs 3
(pass) probe: a deny verdict and a WebSearch call [18.40ms]
```

Failing test, in `src/plugins/dotclaude-browser/slices/search/lab/web-search.test.ts`:

- Input: a `tool.check` stub that answers `{ decision: "deny", reason: "user deny rule" }`, then a `WebSearch` call with `query` `bun`.
- Expected: `out.deny` is a string, and `process.run` has no call.
- Actual: `out.result` holds the page text, and `process.run` has 3 calls.

### F2. I18: the hook drops domain filters with no notice

`domainTerms` drops each entry that does not match `/^[\w.-]+$/`, and each entry after `MAX_DOMAINS` (`src/plugins/dotclaude-browser/slices/search/domain/search.ts:36-40`).
When each `allowed_domains` entry drops, the search runs on all sites, and the result does not tell Claude.
A blocked domain after the tenth can show in the results.
Severity: should-fix.
Confidence: high.

The probe calls `searchQuery` with `allowed_domains: ["https://docs.python.org"]`, and with 11 `blocked_domains` (`b0.com` to `b10.com`).
Line 2 tells whether the query has `b10.com`.

```bash
bun --no-env-file "$TMPDIR/p102/pure/probe.ts"
```

```text
1 "asyncio"
2 false
```

Failing test, in `tests/browser/search.test.ts`:

- Input: `searchQuery({ query: "asyncio", allowed_domains: ["https://docs.python.org"] })`, and `searchQuery` with the 11 `blocked_domains`.
- Expected: no filter drops with no trace, so the query has `site:docs.python.org` and `-site:b10.com`, or the hook gives the call to the built-in `WebSearch`.
- Actual: `"asyncio"`, and the second query has no `-site:b10.com`.

### F3. I14: the default backend uses CloakBrowser with no consent

`webSearch` uses the CloakBrowser binary when one is under `~/.cloakbrowser/`, also when the `backend` option is `agent-browser` (`src/plugins/dotclaude-browser/slices/search/adapters/mod.ts:109-112`).
The `browse` skill says that with the other backend, CloakBrowser needs the agreement of the user (`src/plugins/dotclaude-browser/slices/browse/skills/browse/SKILL.md:26-27`).
The lab test at `web-search.test.ts:227` pins the current behavior with the default options.
Severity: should-fix.
Confidence: medium, because the intent can be that the search is an exception.

```bash
grep -n "Otherwise use it only" src/plugins/dotclaude-browser/slices/browse/skills/browse/SKILL.md
grep -n "const browser = " src/plugins/dotclaude-browser/slices/search/adapters/mod.ts
claude plugin test "$TMPDIR/p102/plugin"
```

The last command ran on the copy before the probe test replaced the lab test.

```text
27:Otherwise use it only after the user agrees to a step of `<blocked_pages>`.
112:  const browser = binary ? CLOAK_NAME : PLAIN_NAME;
(pass) with CloakBrowser builds present, the search uses the newest binary [11.92ms]
```

Failing test, in `src/plugins/dotclaude-browser/slices/search/lab/web-search.test.ts`:

- Input: the default options, the build `chromium-10.2.0` under `/home/me/.cloakbrowser/`, and a `WebSearch` call.
- Expected: no argument vector has `--executable-path`.
- Actual: each of the 3 argument vectors has `--executable-path` with the `chromium-10.2.0` binary.

### F4. I10 and I07: `allowed-tools` grants each `agent-browser` command

`SKILL.md:4` grants `Bash(agent-browser *)`, so while the skill is active, `upload`, `eval`, `cookies`, and `--auto-connect` run with no prompt.
Only prose guards them (`SKILL.md:13-15` and `SKILL.md:50-51`).
Exploit: a page that Claude reads tells Claude to run `agent-browser upload "#f" ~/.config/gh/hosts.yml` on a form of the attacker, and no prompt stops the upload.
Severity: should-fix.
Confidence: medium, because no live session showed the exploit.

```bash
grep -n "Bash(agent-browser" src/plugins/dotclaude-browser/slices/browse/skills/browse/SKILL.md
agent-browser --help | grep -E "^  (upload|eval) "
```

```text
4:allowed-tools: Bash(agent-browser *) Bash(dotclaude-browser-guide)
  upload <sel> <files...>    Upload files
  eval <js>                  Run JavaScript
```

Failing test, in `tests/browser/guide.test.ts`:

- Input: the `allowed-tools` line of `skills/browse/SKILL.md`.
- Expected: no entry matches `agent-browser upload`, `agent-browser eval`, or `agent-browser --auto-connect`.
- Actual: `Bash(agent-browser *)` matches each of them, and `guide.test.ts:59-61` pins that line.

### F5. I17 and silent `catch`: a failed close leaves the browser for one hour

`closeSession` drops each error and writes no log (`src/plugins/dotclaude-browser/slices/search/adapters/mod.ts:77-82`).
Its comment says that the idle timeout of the browser closes the session.
But `steps` sets no `--idle-timeout` (`src/plugins/dotclaude-browser/slices/search/domain/search.ts:103-121`), and the default of `agent-browser` is one hour.
Thus each search with a failed or timed-out close can leave a headless Chrome for one hour, and nothing records it.
Severity: should-fix.
Confidence: high for the default, medium for how often a close fails.

```bash
agent-browser --help | grep -o "IDLE_TIMEOUT_MS.*1h"
grep -rn "idle-timeout" src/plugins/dotclaude-browser | wc -l
```

```text
IDLE_TIMEOUT_MS  Auto-shutdown daemon after N ms of inactivity (default: 3600000 = 1h
       0
```

Failing test, in `tests/browser/search.test.ts`:

- Input: `steps("https://x.test", "s")`.
- Expected: the `open` argument vector has `--idle-timeout` with a bound from `slices/search/limits.ts`.
- Actual: no argument vector has `--idle-timeout`.

A second failing test, in `web-search.test.ts`, gives a `close` run that throws, and expects a `$.ui.log` call with `to: "debug"`.

### F6. Smell, an over-broad detector: a results page reads as a bot check

`BOT_CHECK` matches the words `select all squares` at any place on the page (`src/plugins/dotclaude-browser/slices/search/domain/search.ts:34` and `:140`).
A query about those words gives result titles with them, so the hook drops valid results and the built-in `WebSearch` runs.
With the `cloakbrowser` backend, the notice then tells the user that a bot check stopped CloakBrowser, which is false.
Severity: nit.
Confidence: high.

```bash
bun --no-env-file "$TMPDIR/p102/pure/probe.ts"
```

```text
3 {"reason":"The search page asked `agent-browser` for a bot check."}
```

Failing test, in `tests/browser/search.test.ts`:

- Input: `pageResult("select all squares excel", "How to select all squares in Excel - Microsoft Support")`.
- Expected: a `text` result with the page.
- Actual: a `reason` result that names a bot check.

### F7. I18: an `extended` search gets one page with no notice

The `WebSearch` input has `mode: "standard" | "extended"`, and `extended` asks for a thorough search.
The hook does not read `mode`, so an `extended` call gets the text of one DuckDuckGo HTML page (`src/plugins/dotclaude-browser/slices/search/adapters/mod.ts:169-176`).
Severity: nit.
Confidence: medium.

```bash
T=plugins/dotclaude-browser/.claude-plugin/types/claude-code-tools/index.d.ts
grep -n 'mode: "standard"' "$T"
grep -c "mode" src/plugins/dotclaude-browser/slices/search/adapters/mod.ts
```

```text
768:      mode: "standard" | "extended"
0
```

Failing test, in `src/plugins/dotclaude-browser/slices/search/lab/web-search.test.ts`:

- Input: a `WebSearch` call with `mode: "extended"`.
- Expected: the built-in `WebSearch` answers through `next`, or the result says that it is one page.
- Actual: the browser answers, `next` has no call, and the result does not name the mode.

### F8. Smell, a bound outside `limits.ts`: the length of a session name

`sessionName` sets its length with the literals `1296` and `slice(2, 7)` (`src/plugins/dotclaude-browser/slices/search/domain/search.ts:61`).
`SESSION_NAME_MAX` does not control it, and only `tests/browser/search.test.ts:63` reads it.
Severity: nit.
Confidence: high.

```bash
grep -rn "SESSION_NAME_MAX" src/plugins tests | cut -c1-95
bun --no-env-file "$TMPDIR/p102/pure/len.ts"
```

```text
src/plugins/dotclaude-browser/slices/search/limits.ts:23:export const SESSION_NAME_MAX = 12;
tests/browser/search.test.ts:15:  SESSION_NAME_MAX,
tests/browser/search.test.ts:63:  expect(name.length <= SESSION_NAME_MAX, `${name.length}`).toB
longest 11
```

Failing test, in `tests/browser/search.test.ts`:

- Input: 2,000 calls of `sessionName`.
- Expected: the longest name has `SESSION_NAME_MAX` characters, because the code takes its length from the bound.
- Actual: the longest name has 11 characters, and a change of `SESSION_NAME_MAX` changes no name.

## Unconfirmed Findings

- U1, I01 and I18: `CLOAK_BINARY` has only the macOS layout (`src/plugins/dotclaude-browser/slices/search/domain/search.ts:66-67`).
  On Linux, the `cloakbrowser` backend can deny each search with `MISSING_BINARY`.
  This machine has no Linux build to show the layout.
- U2, I10: the page text goes to Claude with no provenance marks, and `agent-browser` has `--content-boundaries` for this.
  The result has one line that says that third parties wrote the text (`search.ts:147`).
  No command shows that an injection gets through here and not through the built-in `WebSearch`.
- U3: two `allowed_domains` give `site:a site:b`, and DuckDuckGo can read the terms as a conjunction, which gives no results.
  The brief forbids a remote site, so no command checked it.
- U4, I17: `$.fs.exists` on an unreadable `~/.cloakbrowser` can give `false`, which reads as no binary (`mod.ts:93`).
  The types do not say what `exists` gives for a permission error.

## Dossier Check

- I01 (`01-grounding-and-memory.md`, I01): the binary path assumes macOS, see U1.
- I02 (`01-grounding-and-memory.md`, I02): the import and module rules are lints (`tests/dotclaude/import-rules.test.ts`, rule 4 and rule 6), and the code passes them, so no finding.
- I03 (`01-grounding-and-memory.md`, I03): the `browse` skill puts the guide in the context, 37,671 bytes from `agent-browser skills get core | wc -c`, under `MAX_GUIDE_CHARS` `40000`, so no finding.
- I04 (`02-verification-and-honesty.md`, I04): the skill asks for the URL, the action, and the result in `<output_format>`, so no finding.
- I05 (`02-verification-and-honesty.md`, I05): no skipped or weak test found.
  The lab test at `web-search.test.ts:302-317` does not assert the notice, but a probe showed that the notice is there.
- I06 (`02-verification-and-honesty.md`, I06): not applicable to this code.
- I07 (`03-safety-and-trust-boundaries.md`, I07): F1 and F4.
- I08 (`03-safety-and-trust-boundaries.md`, I08): each command and flag is in `agent-browser --help` `0.38.2`: `--session`, `--executable-path`, `--max-output`, `get text`, `close`, `skills get core`, `read`, `--profile`, `--auto-connect`, `--headed`, and `snapshot`.
  `$.fs.list`, `$.fs.exists`, and `$.process.run` match the types of Claude Code `2.1.296`, so no finding.
- I09 (`04-engineering-delegation-and-cost.md`, I09): no dead code or duplicate helper found.
- I10 (`03-safety-and-trust-boundaries.md`, I10): F1 and F4, and U2.
- I11 (`04-engineering-delegation-and-cost.md`, I11): not applicable to this code.
- I12 (`04-engineering-delegation-and-cost.md`, I12): the timeouts are in `limits.ts`, and `HookBudget` does not count `$` calls, so the 55 s of browser steps do not overrun the hook, and no finding.
- I13 (`06-autonomy-and-consent.md`, I13): the texts give the user only the install, which is an action of the user, so no finding.
- I14 (`06-autonomy-and-consent.md`, I14): F3.
  `MISSING_BINARY` keeps the `backend` value of the user and does not change it.
- I15 (`06-autonomy-and-consent.md`, I15): `web-search.test.ts:276` asserts a phrase of the notice, which is the output to Claude, so no finding.
- I16 (`07-measurement-and-environment.md`, I16): the lab stubs `process.run`, and its header says that the live browser is not tested.
  The `evals` names in `slice.ts` match the lab test names, so no finding.
- I17 (`07-measurement-and-environment.md`, I17): F5 and U4.
- I18 (`07-measurement-and-environment.md`, I18): F2 and F7.

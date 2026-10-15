# Review of dotclaude-docs (P104)

A `reviewer` run did the review on 2026-10-14, read only.
The main session wrote this file from its report.
Scope: `src/plugins/dotclaude-docs/`, `tests/docs/docs.test.ts`, and the two places in the core plugin that name this add-on (`src/fragments/docs-snippet.json` and `src/plugins/dotclaude/slices/setup/domain/addons.ts`).
The probes are in `$TMPDIR/p104-probe/`.
The fix package is P130.

## Confirmed Findings

### F1. I08: The Skill Runs an Unpinned `ctx7@latest`

`src/plugins/dotclaude-docs/slices/docs/skills/docs/SKILL.md:4` and lines 18 to 19 run `bunx -y ctx7@latest`.
Each call can run new code from the registry, with no review.
On 2026-10-13 `latest` moved from the checked `0.5.14` to `0.6.1`.

```bash
curl -s https://registry.npmjs.org/ctx7 | bun -e '
const j = await Bun.stdin.json()
console.log(j["dist-tags"].latest, j.time[j["dist-tags"].latest])
console.log(j.time["0.5.14"])'
```

```text
0.6.1 2026-10-13T13:36:13.502Z
2026-10-07T09:07:12.126Z
```

Failing test, in `tests/docs/docs.test.ts`:

- Input: the `allowed-tools` value and each command line of the `bash` block of `SKILL.md`.
- Expected: each one names an exact version that matches `ctx7@\d+\.\d+\.\d+`.
- Actual: each one names `ctx7@latest`.

### F2. I10 and I07: The Permission Rule Allows the Write Subcommands of `ctx7`

The rule `Bash(CTX7_TELEMETRY_DISABLED=1 bunx -y ctx7@latest *)` at `SKILL.md:4` allows each subcommand, not only `library` and `docs`.
`ctx7` 0.6.1 has `skills install <repo>`, which writes a skill from a GitHub repository to `.claude/skills/`, and `setup`, which changes the agent config.
The docs text comes from a public index, and only prose (`SKILL.md:35`) stops an injected call.
Exploit: a docs page tells Claude to run the rule prefix followed by `skills install /owner/repo --global --claude -y`, and Claude Code runs it with no prompt.
The probe applies the prefix match of a `Bash(X *)` rule.

```bash
grep -c 'skill.command("install")' "$TMPDIR/p104-probe/b/package/dist/index.js"
bun "$TMPDIR/p104-probe/match.ts"
```

```text
1
snippet rule matches skill call: false
snippet rule matches skill call: false
skill rule matches skills install: true
skill rule matches setup: true
```

Failing test, in `tests/docs/docs.test.ts`:

- Input: the `allowed-tools` rules and the command `<prefix> skills install /owner/repo -y`.
- Expected: no rule matches, because the rules name only `library` and `docs`.
- Actual: the rule matches.

### F3. I01: The Skill Gets the Latest Docs, Not the Docs of the Project Version

`SKILL.md:22` to `SKILL.md:25` have no step that reads the version of the library from the project, such as a lockfile or `package.json`.
The skill also does not use a versioned library ID.
`ctx7` supports versioned IDs.

```bash
grep -n -i "version\|lock\|package.json" \
  src/plugins/dotclaude-docs/slices/docs/skills/docs/SKILL.md
grep -o 'For version-specific docs, use [^(]*' \
  "$TMPDIR/p104-probe/b/package/dist/index.js"
```

```text
3:description: Gets current docs ... Use when a task needs the API of a library version ...
For version-specific docs, use \`/org/project/version\` from the \`library\` output
```

Failing test: a new eval, `src/plugins/dotclaude-docs/evals/pinned-version/case.yaml`.
A `tool_used` grader checks the `Bash` input.
A unit test on the skill text would only test prose (I15).

- Input: a scaffold with `package.json` that pins `next` at `14.2.3`, and a question about a `next` API.
- Expected: the `docs` call names an ID that ends in `/v14.2.3`.
- Actual: the skill has no step that reads the version, so the ID has no version.

### F4. I18: The Settings Snippet Allows a Different Command

`src/fragments/docs-snippet.json:5` allows `npx -y ctx7@0.5.14`, but the skill runs `bunx -y ctx7@latest`.
The rule that setup writes never matches a call of the skill.
The F2 probe shows `snippet rule matches skill call: false` for both calls.
`tests/docs/docs.test.ts` passes (`3 pass`, `0 fail`) because no test compares the two rules.

Failing test, in `tests/docs/docs.test.ts`:

- Input: each command line of the `bash` block of `SKILL.md`, and the `Bash(...)` rule of `docs-snippet.json`.
- Expected: the rule matches each line.
- Actual: `false` for each line.

### F5. I18: The Add-on Check Reads `npx`, but the Skill Runs `bunx`

`src/plugins/dotclaude/slices/setup/domain/addons.ts:66` reports the `npx` version for `dotclaude-docs`.
This file is in the `setup` slice of the core plugin.

```bash
bun -e 'import { planAddons } from "./src/plugins/dotclaude/slices/setup/domain/addons.ts"
console.log(planAddons(["dotclaude-docs"], { projectDir: "/p", bun: "1.4.3",
  version: (p) => (p === "npx" ? null : "1.4.3"), indexBuilt: false }).lines)'
```

```text
[ "dotclaude-docs: npx not found" ]
```

Failing test, in `tests/dotclaude/setup/addons.test.ts`:

- Input: `planAddons(["dotclaude-docs"], ...)` with no `npx` and with Bun `1.4.3`.
- Expected: a line that names `bunx` or Bun, with no "not found".
- Actual: `dotclaude-docs: npx not found`.

### F6. Smell, Bound Outside `limits.ts`: The Call Bound Is Prose Only

`SKILL.md:30` sets the bound of 3 `ctx7` calls.
The bound has no `limits.ts`, no `{{NAME}}` marker, and no row in `wiki/reference/Bounds.md`.
`CLAUDE.md` puts each slice bound in `slices/<s>/limits.ts`, but `wiki/add-ons/Library-Docs.md:70` says that the plugin has no `limits.ts`.

```bash
ls src/plugins/dotclaude-docs/slices/docs/limits.ts
grep -c "ctx7\|CTX7" tools/generate/emit/fill.ts wiki/reference/Bounds.md
```

```text
ls: src/plugins/dotclaude-docs/slices/docs/limits.ts: No such file or directory
tools/generate/emit/fill.ts:0
wiki/reference/Bounds.md:0
```

Failing test, in `tests/docs/docs.test.ts`:

- Input: the generated `plugins/dotclaude-docs/skills/docs/SKILL.md`.
- Expected: the source has a `{{CTX7_CALLS_MAX}}` marker, and the generated text has the value from `slices/docs/limits.ts`.
- Actual: the file has no `limits.ts`, and the text has a literal `3`.

## Unconfirmed Findings

- I18: Under the Claude Code sandbox, `bunx` writes its cache to `~/.bun/install/cache`, so the sandbox can block the call.
  No probe ran `bunx`, because a run changes state outside `$TMPDIR`.
- I03 and I12: The skill sets no bound on the size of the `docs` output, which goes into the context.
- F2: The probe does not show that Claude follows an injected `skills install` call.
  It shows only that the rule allows the call.

## Dossier Check

- I01: Gap, F3 (`01-grounding-and-memory.md`, I01 Industry Practice and Recipe step 1).
- I02: The form of the call is in config, but the bound and the rule that docs are data are prose only, F6 (`00-INDEX.md`, principle 1).
- I03: Unconfirmed, the docs output has no bound (`01-grounding-and-memory.md`, I03).
- I04: No gap found, because step 3 names the library ID that Claude used (`02-verification-and-honesty.md`, I04).
- I05: No gap found, because the 3 tests can fail and nothing is skipped (`02-verification-and-honesty.md`, I05).
- I06: No gap found, because the skill tells Claude to say what is missing (`02-verification-and-honesty.md`, I06).
- I07: Gap, F2: the rule allows the write subcommands (`03-safety-and-trust-boundaries.md`, I07).
- I08: Gap, F1: the CLI version is not pinned (`03-safety-and-trust-boundaries.md`, I08 Supply-Chain Gates).
- I09: No gap found, because the plugin has no runtime code (`04-engineering-delegation-and-cost.md`, I09).
- I10: Gap, F2: only prose protects against injection from docs (`03-safety-and-trust-boundaries.md`, I10).
- I11: Not applicable, because the skill delegates no work (`04-engineering-delegation-and-cost.md`, I11).
- I12: The 3-call bound is prose only, F6 (`04-engineering-delegation-and-cost.md`, I12).
- I13: No gap found, because the skill asks the user only after a denied call (`06-autonomy-and-consent.md`, I13).
- I14: No gap found, because the skill tells Claude not to raise the bound or change the form (`06-autonomy-and-consent.md`, I14).
- I15: No prose test found, but the tests do not check the permission rules, F4 (`06-autonomy-and-consent.md`, I15).
- I16: The plugin has no eval, so nothing measures the skill, F3 (`07-measurement-and-environment.md`, I16).
- I17: Not applicable, because the plugin starts no background job (`07-measurement-and-environment.md`, I17).
- I18: Gap, F4 and F5: the runner and the version differ between the skill, the snippet, and the check (`07-measurement-and-environment.md`, I18).

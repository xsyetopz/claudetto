# Mods

## Mods and Lab Tooling

- [x] **CTX-233** claudetto shall rely on these measured facts: the lab loads `*.test.ts` only inside the plugin folder; `claude plugin validate`/`test` do not write `.claude-plugin/types` while a print run with `CLAUDE_CODE_PLUGIN_DIR_WATCH=1` does (2.1.319; env present in 2.1.326, binary string search: 6 hits); a lab test asserting `undefined` equals `undefined` passed and only `bun check` flagged it; baseline 62e2fe96 (2.1.318, Bun 1.4.4) held 23,266 lines in plugins/claudetto/src (16,049 non-test), 23 blocks, 20 userConfig keys, a 4,677-line gate with 27 spec tests, 1,257 you-should-know source lines; `test` 1,776 pass, 7 fail, 2 errors from confine limits (mkdtemp EPERM, pty/tmux).
  Acceptance: Each figure is reproduced from its run before use. Verification: probe.
  Basis: measured. Status: have at 088a227c (tests/, tools/).
  Source: openspec/specs/mod-architecture/spec.md:107; openspec/specs/mod-architecture/spec.md:28; openspec/changes/2-1-325-rearchitecture/items.json:114; openspec/changes/archive/2026-11-09-release-2-1-319/design.md:8.
  Verified: PASS (partial, edited): git at 62e2fe96, binary 2.1.327, 2026-11-19: plugins/claudetto/src holds 23,266 lines in 270 files (reproduced); non-test lines are 16,049 by path without test or spec (16,105 excluding __tests__ folders), so the fact's 16,079 was replaced with 16,049. Run results (1,776 pass, 7 fail) and the gate counts belong to that build and were not rerun. CLAUDE_CODE_PLUGIN_DIR_WATCH is in the 2.1.327 bundle (6 hits earlier).
  Verified: probe, claude 2.1.327, 2026-11-19: in a fresh clone of 5aa893862, `bunx tsc -p plugins/claudetto-you-should-know/tsconfig.json --noEmit` exits 1 with three TS6053 errors (no `.claude-plugin/types`); after one interactive session started with `--plugin-dir` on that plugin, the folder holds `claude-code`, `claude-code-mcp`, `claude-code-tools` and the same command exits 0, with `git status` clean. `just verify` names this step when the folder is missing.

## Mods and Lab Tooling
  Verified: claude plugin test --help and binary string search, claude 2.1.327, 2026-11-19: help says it runs every *.test.ts and *.test.tsx under dir, each file in a child of the binary; CLAUDE_CODE_PLUGIN_DIR_WATCH is in the bundle (5 hits) and the docs page nouns-and-gates describes it (reload on save, off in print mode unless set to 1); the type-folder write claim was not rerun.

- [x] **CTX-235** `$.command.run` runs a slash command as if typed, queued until idle, and rejects inside a hook the turn waits on; hooks see `e.origin` `{kind:'plugin'}`. `$.prompt.submit` submits a prompt as its own turn once idle. `$.session.compact` compacts between turns with trigger `plugin`.
  Acceptance: the types in clawdipedia `get_schema` `types` match. Verification: inspection.
  Basis: cited. Status: have.
  Source: clawdipedia docs `get_schema` types (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:5807).
  Verified: binary string search, claude 2.1.327, 2026-11-19: $.command.run (11 hits) and prompt.submit (66) are in the bundle; the behaviour stays as measured on the earlier version named in the fact and was not rerun.
  Verified: PASS: clawdipedia-docs get_schema types CommandRunInput, binary 2.1.327, 2026-11-19: origin is PromptOrigin and a plugin's $.command.run reads { kind: 'plugin', name }; $.prompt.submit and $.session.compact were not looked up in the schema.

- [x] **CTX-236** Subagents default to a 5 min cache TTL; the allowlist for the longer TTL is `repl_main_thread*`, `sdk`, `auto_mode`, `memdir_relevance` (2.1.327: allowlist `QSt` at chunk-m14bt1pz.js@2564092, 5 min default at chunk-m14bt1pz.js@3210453; 2.1.325: `rNe`, `chunk-wqb2b4v0.js:3067022`, precedence in `cIn`, `:2438231`).
  Acceptance: the code at the offsets matches. Verification: inspection.
  Basis: measured. Status: have.
  Source: chunk-m14bt1pz.js@2564092 and @3210453 (claude 2.1.327 binary, read 2026-11-18); `chunk-wqb2b4v0.js:3067022` (claude 2.1.325 binary) (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:5807).
  Verified: source already on 2.1.327.
  Verified: PASS: allowlist QSt at chunk-m14bt1pz.js@2564093; the 5 minute default was not checked. Binary 2.1.327, 2026-11-19, re-checked from the B-setup report.

- [x] **CTX-237** Tool names are case-sensitive: a call to `bash` fails with "No such tool available"; `Bash` works.
  Acceptance: the error text reproduces. Verification: demonstration.
  Basis: reported. Status: have.
  Source: reported, user, 2026-11-16 18:24 UTC, tool names keep their case, `Bash` not `bash` (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:5608).
  Verified: PASS (text only): code search, binary 2.1.327, 2026-11-19: the error '<tool_use_error>Error: No such tool available: <name>' is in chunk-m14bt1pz.js@2092981; a fake-API call to lowercase `bash` ends the run without a second request, so the result text is not visible and the case-sensitivity was not shown by probe.

## Mods and Lab Tooling
  Verified: binary string search, claude 2.1.327, 2026-11-19: "No such tool available" is in the bundle (15 hits); the behaviour stays as measured on the earlier version named in the fact and was not rerun.

- [x] **CTX-238** `$.model.fork({prompt, effort})` runs one tool-less completion over the main thread's last request with the prefix from cache; it returns `isAnswered`, `text`, `usage`, or `reason:'nothing-to-fork'` when no turn ran since a clear or resume. Hook time stops during `$` calls and the hook's own budget is 10 s; `session.end` hooks share 1.5 s; `prompt.context` fires once per conversation and answers `{blocks:[{name,text}]}`.
  Acceptance: the docs pages match. Verification: inspection.
  Basis: cited. Status: have.
  Source: clawdipedia mod-api pages, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:6738).
  Verified: binary string search, claude 2.1.327, 2026-11-19: nothing-to-fork is in the bundle (3 hits); the behaviour stays as measured on the earlier version named in the fact and was not rerun.
  Verified: PASS (text only): code search, binary 2.1.327, 2026-11-19: 'nothing-to-fork' is in the bundle (3 hits); the 10 s and 1.5 s budgets and the docs pages were not rechecked.

- [x] **CTX-850** The official mods overview, read 2026-11-18, says the following:
  - Mods are on by default from Claude Code v2.1.287 in the terminal and from v2.1.286 in the Desktop app.
  - Claude Code ignores the early-access variable `CLAUDE_CODE_ENABLE_FUNCTION_HOOKS`.
  - A mod can restyle much of the interface, but not the permission prompt.
  The page never uses the word "stable" and says nothing about a sidebar. Two commenters call mods stable and encouraged; that matches the on-by-default statement. Their sidebar claim stays reported only.
  Acceptance: plan text calls mods on by default since v2.1.287, cites this page, and does not call them stable. Verification: inspection.
  Basis: cited (official docs page); reported (sidebar). Status: n/a (Claude Code behaviour).
  Source: <https://code.claude.com/docs/en/plugins/mods/overview> (read through the clawdipedia-docs `code` source, 2026-11-18); external/2026-11-18/reddit.com-r-claudecode-comments-1xypgto-context-bar-mod-for-claude-cod-20261117T224722Z.md:63-71 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xypgto/context_bar_mod_for_claude_code_desktop_app/>); reports/2026-11-18-research/dossier.md:191.
  Verified: binary string search and docs search, claude 2.1.327, 2026-11-19: CLAUDE_CODE_ENABLE_FUNCTION_HOOKS is in the bundle (3 hits); the clawdipedia-docs Mod API pages cover 2.1.327 and describe mods as early access; the v2.1.287 and v2.1.286 default-on dates and the sidebar remark were not re-found by search and stay as cited.
  Verified: PASS (partial): docs search and read of plugins/mods/overview, binary 2.1.327, 2026-11-19: the page opens as a description of mods without the word stable in the text read (first 3,500 characters); CLAUDE_CODE_ENABLE_FUNCTION_HOOKS is in the bundle (3 hits); the v2.1.287 date and the sidebar remark were not found by search and stay as cited.

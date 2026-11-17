# Edit Risks

## Agent Conduct

- [ ] **RISK-416** The agent or its worker edits files with `sed -i`, `sed`, or `bun -e` where the project rule names the edit tool.
  - Category: conduct.
  - Cause: Shell habit; the Bash text says otherwise; a prose instruction is ignored; caches of code go stale; no hook stops `sed` or a script edit; the agent admits the slip only in its report; the agent reaches for the shell before `Read` and `Edit`; The agent runs sed -n to read and python scripts with a replace function to edit files, although the repo rule says: read with Read, edit with Edit or Write, never sed, awk, echo, or python; The rule lives in prose in the handoff and the project instructions; nothing denies the call; The gate blocks those forms.
  - Event: cat, head, tail, sed, awk, echo used to read or change files; batch perl -0pi edits hiding changes with a typo'd regex; whole-file overwrite instead of a targeted edit (471 vs 42, measured by poster); exploration-script sprawl (116 scripts, 563 turns); the model keeps grepping instead of calling the code-graph index tool; a stale index answers with old names; the agent breaks the rule on one file or a bulk edit, then names the slip afterwards; the guard denied `sed -n 1,80p` chained with `grep`, and the agent retried with `Read`. Another session used `sed -i` and `sed -n`. The Read redirect once took a `sed` range for a file path and told the agent to read a file named `370,376p`; The tool calls show sed on a wiki file and a python heredoc that rewrites a test and a plist; The agent used printf `>>` on `.gitattributes` and cat and sed reads, twice, and had to confess it in the report; A command is refused.
  - Consequence: Silent wrong edits and wasted turns; an edit outside the tool the project checks; an extra line in the report; a denied call and an extra turn; a rule missed. Likelihood: 1; a wasted turn on each block; a redirect with a wrong path; Edits skip the edit tool's read-first check; a blind rewrite can lose text; A user rule broken and a correction owed.
  - Likelihood: 5
  - Impact: 3
  - Existing controls: the Bash read redirect (it also misparses `head -c N` and `sed -n 'a,bp'`, `issues-2026-11-09.md:31`); the guard redirects shell reads to `Read` (the user calls the hook good); Repo rule text in each handoff; no hook enforces it; The agent reported the slips itself; Use Read and Write; the claim "The gate denies sed -n, cat reads and heredocs" is missing at 088a227c.
  - Response: mitigate.
  - Actions: A gate rule moving reads to Read (read-guard attempted 50/60 vs 2/60: it bounds what lands, not what is tried), a ready Read call in the denial, use Edit; a PreToolUse hook that blocks find, grep, cat where the tool applies and a freshness check in the tool; claudetto shall block `sed` and script edits of tracked files and point to the Edit tool or the perl batch edit tool; read every file of a named folder, in slices; the agent uses `Read` and `Edit` first. Fix the redirect so a `sed` range is never named as a path; claudetto shall deny a shell command that reads or edits a file in place and point to Read, Edit, or Write; Deny a forbidden command by a hook rule the user lists, with a message that names the allowed tool; see REQ-REPLY on naming slips; Use Read for reads and Write for files.
  - Trigger: A Bash call reads or edits a file the Read or Edit tool could; a Bash call with `sed -i` or `bun -e` that writes a tracked file; a Bash call that reads a file; a shell command starts with `sed`, `cat`, `head`, or `tail` on a file; A Bash command with sed -i, sed -n on a file, or python that writes a file; A Bash call starts with a command the user forbade; The agent runs a denied form.
  - Owner: edit
  - Status: open.
  - Source: openspec/changes/archive/2026-11-09-release-2-1-319/evidence/18-5/README.md:33; external/2026-11-16/reddit.com-r-claudecode-comments-1xuiwi6-minimize-token-usage-20261116T052542Z.md:148 (url: https://www.reddit.com/r/ClaudeCode/comments/1xuiwi6/minimize_token_usage/) (reported). Not located: 116 scripts and 563 turns; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-apple-docs-mcp-next/64a2df4f-21df-4ffa-98fb-39ce5c90634f.jsonl:2305, observed in transcript, 2026-11-11; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenSAD/d660bb03-7e7b-4a72-b6ff-89b9b26db0f3.jsonl:1899, observed in transcript, 2026-11-12; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenSAD/d660bb03-7e7b-4a72-b6ff-89b9b26db0f3.jsonl:2231, observed in transcript, 2026-11-12; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenSAD/d660bb03-7e7b-4a72-b6ff-89b9b26db0f3.jsonl:3136, observed in transcript, 2026-11-12; openspec/changes/archive/2026-11-16-2-1-323/research/issues-2026-11-09.md:31 (read); openspec/changes/archive/2026-11-16-2-1-323/research/issues-2026-11-09.md:41; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/b8e1aaed-abd0-4456-8651-81e51b934bea.jsonl:1708 (reported, user, 2026-11-09); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/d21b8a3c-f9ed-4529-894d-f27c09158b69.jsonl:5363 (reported, user, 2026-11-10); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/da178184-7a4f-48bb-8d66-284f77e45c23.jsonl:269; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/b8e1aaed-abd0-4456-8651-81e51b934bea.jsonl:1708, reported, user, 2026-11-09; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/d21b8a3c-f9ed-4529-894d-f27c09158b69.jsonl:5363, reported, user, 2026-11-10; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/da178184-7a4f-48bb-8d66-284f77e45c23.jsonl:269, observed in transcript, 2026-11-09; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/92c2d0ed-d53e-44cb-8e0e-be2c127d057d.jsonl:5489 (TOOLS, sed -n on wiki/Controller-Records.md); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/92c2d0ed-d53e-44cb-8e0e-be2c127d057d.jsonl:10452 (TOOLS, python3 heredoc with rep(p,a,b)); observed in transcript, 2026-11-14 and 2026-11-15; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenSAD/d660bb03-7e7b-4a72-b6ff-89b9b26db0f3.jsonl:11 (standing instructions); observed in transcript, 2026-11-12; observed in transcript, 2026-11-09 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/60a81b6a-7024-4fb4-9f19-6d79c0fd6d65.jsonl:11) (observed in transcript, 2026-11-09).

## Code And Prose Edits

- [ ] **RISK-417** On Windows an agent edits shell scripts through a Python one-liner that rewrites CRLF line endings; the Linux deploy fails with an error that points nowhere near line endings.
  Category: agent fault
  Cause: Whole-file rewrite by a script on Windows
  Event: The deploy fails
  Consequence: A failed deploy that is slow to diagnose
  Likelihood: 1 (one report)
  Impact: 3
  Existing controls: none found at 088a227c
  Response: mitigate
  Actions: Edit with a tool that keeps line endings; check line endings when a shell script fails on deploy
  Trigger: A script rewritten on Windows
  Owner: edit
  Status: open
  Source: external/2026-11-10/reddit.com-r-claudecode-comments-1xsfrvr-the-ways-coding-agents-broke-o-20261110T095743Z.md:85 (url: https://www.reddit.com/r/ClaudeCode/comments/1xsfrvr/the_ways_coding_agents_broke_our_codebase_and_the/).

## Self-Written Helper Scripts

- [ ] **RISK-418** Self-written helper scripts are tuned for "works", not for speed.
  Category: agent failure.
  Cause: Scripts the agent writes for itself weigh "working" over "works well or fast": a two-step fix tool grows a check, then replan, then refix path that it runs 100,000 times.
  Event: The agent runs a slow self-written tool repeatedly without asking whether step 1 could be fixed.
  Consequence: Extra runtime and tokens on repeated work.
  Likelihood: 1 (one report; a second commenter in the same thread gives the cure).
  Impact: 2 (an extra turn per run).
  Existing controls: Unchecked at 088a227c.
  Response: mitigate.
  Actions: Have the agent review its own tooling critically; move repeated work into prebuilt scripts (no run-to-run hallucination, faster, no tokens spent writing it). A periodic prompt: "look back at the last two weeks of work, what kind of work was done over and over that we could just turn into a script". A Go tool measured about 50x faster than the Python original (reported, one user). A second commenter has the model build local tools for repetitive batch work instead of spending tokens on it .
  Trigger: The same helper script is rewritten across sessions, or a tool runs past a few seconds per call.
  Owner: edit.
  Status: open.
  Source: external/2026-10-28/reddit.com-r-claudeai-comments-1xhagg6-whats-one-thing-about-claude-cod-20261028T060218Z.md:85; external/2026-10-28/reddit.com-r-claudeai-comments-1xhagg6-whats-one-thing-about-claude-cod-20261028T060218Z.md:97 (url: https://www.reddit.com/r/ClaudeAI/comments/1xhagg6/whats_one_thing_about_claude_code_you_only/); external/2026-11-02/reddit.com-r-claudeai-comments-1xl9c92-forget-the-usual-claude-tips-wha-20261101T191418Z.md:141 (url: https://www.reddit.com/r/ClaudeAI/comments/1xl9c92/forget_the_usual_claude_tips_what_are_the_strange/)

## Edit

- [ ] **RISK-419** Edit "String to replace not found" from one tab too deep.
  - Category: Claude Code limit.
  - Cause: `Read` writes each line as `N` then a tab then the text, and the model counts that tab as indentation. Claude Code 2.1.323 holds a fix behind the server flag `tengu_tab_read_sep` (off). `CLAUDE_INTERNAL_FC_OVERRIDES` does nothing in the public build.
  - Event: 132 of 14,683 `Edit` calls (0.9%); of 98 classified misses, 49 are indentation only, 39 exactly one tab too deep in tab-indented files. `Edit` input is validated before `PreToolUse` (code=8, the hook never runs) and `PostToolUseFailure` does not fire for `Edit` validation errors (control: it fires for Bash exit 1). Parallel `Edit` calls in one response run in turn, so there is no race.
  - Consequence: an extra turn per miss.
  - Likelihood: 4
  - Impact: 2
  - Existing controls: none; no plugin lever exists.
  - Response: accept.
  - Actions: recorded only.
  - Trigger: an `Edit` in a tab-indented file.
  - Owner: edit
  - Status: accepted
  - Source: openspec/changes/archive/2026-11-16-2-1-323/research/defects.md:615 (measured).

# auto-mode

## Auto Mode

- [x] **CTX-113** On first party the main request carries `safeguards [{type:"dangerous_tool_use", classifier_context}]` (6,227 chars) under beta `auto-mode-classifier-2026-07-16`, and the server judges each `tool_use`. The 63,413-char local two-stage prompt is the fallback when the server gives no result (fake API, gateway). A real run's block "The server-side auto mode classifier judged this action dangerous" made no classifier request of its own. stderr says first-party classifier requests are no longer charged.
  Basis: cited, claude 2.1.318.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:3022; <https://github.com/anthropics/claude-code/releases/tag/v2.1.326> (release notes: "Fixed auto mode staying on its local classifier, which counts toward usage, because of a stale saved value"; HIPAA organizations on a direct API connection now get the server-side classifier).
  Verified: binary string search, claude 2.1.327, 2026-11-19: "auto-mode-classifier-2026" (2 hits), "dangerous_tool_use" (4) and "The server-side auto mode classifier judged" (2) are in the bundle; the byte counts were not rechecked.

- [x] **CTX-117** Classifier model order in 2.1.318: the server-configured model, then `CLAUDE_CODE_AUTO_MODE_MODEL`, then the Sonnet 5 default (`claude-sonnet-5`, not a -5-5 model), then the session model when `availableModels` excludes it. The variable refuses `claude-sonnet-5-5`, `claude-opus-5-5`, and `claude-opus-5` (safeguards refuse the escalated check; the default reviews instead); `claude-haiku-5-5` passes. The server review is free on Pro, Max, Ultra, and Team with feature-flag fetching off. `autoMode` has no model key. The user read the auto-mode server row in `/status` as "Enabled" (2026-11-04). Proposed: leave `CLAUDE_CODE_AUTO_MODE_SERVER` at its default. `claude -p "/status"` prints "/status isn't available in this environment."
  Basis: cited, docs plus binary read; the `/status` row reported by one user.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1032; openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1690.

## Auto Mode
  Verified: code read (cc-inspect code search and binary strings), claude 2.1.327, 2026-11-19: order is server-configured model, then CLAUDE_CODE_AUTO_MODE_MODEL, then the Sonnet 5 default; the "ignoring CLAUDE_CODE_AUTO_MODE_MODEL ... takes priority" warning is in the bundle. The per-model refusal list and the `/status` row were not rechecked.

- [x] **CTX-118** Auto mode stops after 3 consecutive or 20 total denials; `PermissionDenied` returns only `retry: true`. `PermissionDenied` is present on 2.1.326 (checked: `code` search finds it in the hook name list and the text "The PermissionDenied hook indicated you may retry this tool call.").
  Acceptance: the docs page for auto mode states 3 and 20. Verification: inspection.
  Basis: cited (docs). Status: have at 088a227c.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:3016; chunk-ja5z738t.js@5720; chunk-4xhk2fyb.js@8658 (claude 2.1.327 binary).

## Auto Mode
  Verified: source already on 2.1.327.

- [x] **CTX-124** Sandbox 2.1.323 denies writes to 14 paths: `.claude/settings.json`, `settings.local.json`, `skills`, `hooks`, `commands`, `agents`, `workflows`, `routines`, `output-styles`, `launch.json`, `scheduled_tasks.json`, `loop.md`, `.claude/.cc-writes` (new), `.mcp.json`. `.claude/rules`, `plugins`, and `projects` stay writable. The list above is for 2.1.323 and changed on 2.1.327 (chunk-1yrzf3wn.js@992559, @997379, @997600): the home `~/.claude` set now holds shell-snapshots, session-env, plugins, hooks, skills, workflows, commands, agents, routines, rules, output-styles, scheduled_tasks.json, launch.json, CLAUDE.md, projects, daemon.json, policy-limits.json, backups, loop.md and cowork_plugins, so `rules`, `plugins` and `projects` are no longer writable (this session's sandbox config lists the same names as denied). The project `.claude` set is launch.json, workflows, routines, output-styles, scheduled_tasks.json, loop.md, skills, commands, agents, hooks, settings.json and settings.local.json, plus `.mcp.json`. `.cc-writes` is a constant in chunk-3kptb39p.js@3835; its place in the deny list was not located. The release-note statement about fewer sensitive home folders is the program vendor's text and was not tested by a write.
  Basis: measured.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/probes.md:204; <https://github.com/anthropics/claude-code/releases/tag/v2.1.326> (release notes).
  Verified: source already on 2.1.327 (the deny list is rewritten to the 2.1.327 sets, chunk-1yrzf3wn.js); this session's sandbox config on 2.1.327 lists the same home names as denied.

- [x] **CTX-125** The macOS command sandbox blocks writes to `.git` (`.git/worktrees`, so `git worktree add` fails inside it; also index.lock, config, hooks, worktree folders), writes to /opt/homebrew, opening a pty (`openpty: Operation not permitted`, so an interactive tool survey needs a real terminal), Chrome's app folder, and the keychain that gh reads; each fails with "Operation not permitted" or an auth failure (each seen in one run). On 2.1.327 the sandbox builder keeps a set of `.git` scrub paths (`retainedScrubPaths`, `bareGitRepoScrubPaths`, gate `tengu_steady_wren`, chunk-1yrzf3wn.js@997600), which fits the release note that unexpected `.git` entries are set aside after a command; the per-item results below were measured on 2.1.322-2.1.323 and were not re-run on 2.1.327. Sandbox 2.1.322: `.git/config` and `.git/hooks` writes fail even with `sandbox.filesystem.allowGitConfig: true`; commit, worktree add/remove of session-made worktrees and `git -c` pass; a clone outside the working folder passes; `.vscode`, `.idea`, `.claude/commands` and `/opt/homebrew` stay closed even with allowWrite; headless Chrome fails even with `/private/var/folders` and `allowAllUnixSockets`; `denyRead` on ~/Library/Keychains alone breaks `gh auth status`, and `allowRead` of login.keychain-db restores it. 2.1.326: the binary reads `sandbox.filesystem.allowGitConfig` (default false), so the key is present; the earlier note that it was absent in 2.1.325 does not hold by binary string search (the 2.1.325 binary holds it too); on 2.1.327 `V_()` returns `Qe?.filesystem?.allowGitConfig??!1` (chunk-1yrzf3wn.js@857976) and passes it to the macOS and Linux sandbox builders (@861475); whether it lifts the `.git/config` write refusal was not re-run on 2.1.327, and the other items were measured on earlier builds. The 2.1.326 release notes say the Bash sandbox now sets aside unexpected entries in a repository's `.git` folder after a command.
  Basis: observed in transcript (the pty case, 2026-11-12); reported, user (the rest, 2026-11-09 and 2026-11-13). measured.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/b8e1aaed-abd0-4456-8651-81e51b934bea.jsonl:7, reported, user, 2026-11-09; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/cd2e74f0-9cdf-4300-b148-fa16b64f6d5c.jsonl:4811, observed in transcript, 2026-11-12; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:19, reported, user, 2026-11-13; <https://github.com/anthropics/claude-code/releases/tag/v2.1.326> (release notes); openspec/specs/sandbox/spec.md:131; openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:760
  Verified: source already on 2.1.327 for the .git scrub paths and allowGitConfig; this session's sandbox (claude 2.1.327, 2026-11-19) lists .git/worktrees as read-only, which fits the worktree-add failure. Per-item results from earlier builds stay marked as not rerun in the fact.

- [x] **CTX-126** The auto mode classifier can return no verdict for a Bash call when another call in the same response changed after review; it says to reissue the call alone and, if denied again, to continue and tell the user.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/b8e1aaed-abd0-4456-8651-81e51b934bea.jsonl:7, reported, user, 2026-11-09.
  Basis: reported, user (the error text).
  Verified: binary string search, claude 2.1.327, 2026-11-19: the bundle holds the text that a call changed after review may be sent once more alone and otherwise not again, plus the tengu_auto_mode_reissue_exempt event.

- [x] **CTX-127** The sandbox blocks `ps` and `sysctl` with "Operation not permitted", so the two session-start tests of `tools/manifest.test.ts` fail inside it.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/d21b8a3c-f9ed-4529-894d-f27c09158b69.jsonl:5915, observed in transcript, 2026-11-10; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/b8e1aaed-abd0-4456-8651-81e51b934bea.jsonl:3391, observed in transcript, 2026-11-09.
  Basis: observed in transcript, 2026-11-10.
  Verified: probe, claude 2.1.327, 2026-11-19: in this sandbox `ps` and `sysctl` both fail with "Operation not permitted".

- [x] **CTX-128** The sandbox blocks an overwrite of `~/.claude/settings.json` with "Operation not permitted".
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/aea6b517-d507-41e2-9f42-d229baaf5384.jsonl:3962, observed in transcript, 2026-11-10.
  Basis: observed in transcript, 2026-11-10.
  Verified: sandbox config, claude 2.1.327, 2026-11-19: this session's write deny list names ~/.claude/settings.json.

# Runtime Limits

- [x] **CON-022** Subagents: the parent's bypassPermissions, acceptEdits or auto mode overrides the child's mode; protection against a child selecting bypassPermissions needs v2.1.267 or later; inline MCP servers in project agent files lacked the trust check before v2.1.238; a subagent with no model inherits the main model; a session holds 20 concurrent subagents and 3 nesting levels.
  Basis: cited, reported.
  Source: external/2026-10-07/claude-llm-agent-failure-dossier.md:431 (S49: parent bypass, acceptEdits or auto overrides the child's mode; protection from v2.1.267; inline MCP trust check from v2.1.238). Verified on 2.1.327: nesting depth default 3 (chunk-ja5z738t.js@341; https://clawdipedia.cc/extend/subagents/runtime, Documented); concurrency default 20 (chunk-m14bt1pz.js@4499713, limit error chunk-3v1e1y2y.js@79758); nesting error text chunk-3v1e1y2y.js@42475; model inheritance chunk-3v1e1y2y.js@35065 (per-call `model`, then the agent field, then `CLAUDE_CODE_SUBAGENT_MODEL`, then the main model; https://clawdipedia.cc/extend/subagents/frontmatter); `bypassPermissions` applies to a subagent only when the main session has it (same page, `permissionMode`, Documented).
  Verified: binary strings CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH -> 5 hits, CLAUDE_CODE_SUBAGENT_MODEL -> 19 hits; the item cites docs and chunk offsets (2.1.327, 2026-11-19).
  Verified: re-run on claude 2.1.327, 2026-11-19: partial: 2.1.327 binary: ECt=20 concurrent subagents (chunk-3v1e1y2y.js, perl ctx), spawn depth default n=3 (cc-inspect read chunk-ja9j7x1x.js@150); parent-mode override, v2.1.267/v2.1.238 version facts and "no model inherits" not re-checked

- [x] **CON-023** Moved Out as OUT-2537: third-party report with no probe.

- [x] **CON-024** `CLAUDE_CODE_SCRIPT_CAPS` caps substring counts in Bash text, acts only with `CLAUDE_CODE_SUBPROCESS_ENV_SCRUB`, and forces default permission mode. Verified on 2.1.327 with a correction: `CLAUDE_CODE_SCRIPT_CAPS` is read at chunk-57bg7pbc.js@8282 and the cap check (`Script call limit exceeded...`) at chunk-57bg7pbc.js@8656 and @8992 returns early unless the scrub flag is true (`CLAUDE_CODE_SUBPROCESS_ENV_SCRUB`, chunk-57bg7pbc.js@6840). The forced default mode comes from the scrub flag, not from SCRIPT_CAPS: chunk-rthqjjhy.js@4018 and chunk-7at7cxxb.js@13901 ("Permission mode forced to default - CLAUDE_CODE_SUBPROCESS_ENV_SCRUB is set"). Docs: https://clawdipedia.cc/configure/env-vars/tools-and-bash (SCRIPT_CAPS Documented; SUBPROCESS_ENV_SCRUB Documented and Differs).
  Basis: measured.
  Source: openspec/specs/setup/spec.md:379.
  Verified: binary strings "Script call limit exceeded" -> 2, "Permission mode forced to default" -> 2, CLAUDE_CODE_SUBPROCESS_ENV_SCRUB -> 18 (2.1.327, 2026-11-19).

- [x] **CON-025** `permissions.defaultMode` set to `bypassPermissions` or `auto` is honoured only from policy, user and flag (`--settings`) settings; project and local settings are ignored with the warning "only policy/user/flag settings may grant bypass mode (projectSettings and localSettings are repo-controllable)" (corrected on 2.1.327: chunk-rthqjjhy.js@7033 for bypass, @7759 for auto; a widening guard for the agent view's inherited mode at @7439). Other modes are not restricted by that check (chunk-ja5z738t.js@304335 and @304686).
  Basis: measured.
  Source: openspec/changes/2-1-325-rearchitecture/design.md:105.
  Verified: binary string "only policy/user/flag settings may grant bypass mode" -> 1 hit (2.1.327, 2026-11-19).
  Verified: re-run on claude 2.1.327, 2026-11-19: binary 2.1.327 literals: 'settings defaultMode "bypassPermissions" ignored — only policy/user/flag settings may grant bypass mode (projectSettings and localSettings are repo-controllable)', same for "auto", and the widening guard text present

# Runtime Limits

- [ ] **CON-022** Subagents: the parent's bypassPermissions, acceptEdits or auto mode overrides the child's mode; protection against a child selecting bypassPermissions needs v2.1.267 or later; inline MCP servers in project agent files lacked the trust check before v2.1.238; a subagent with no model inherits the main model; a session holds 20 concurrent subagents and 3 nesting levels.
  Basis: cited, reported.
  Source: external/2026-10-07/claude-llm-agent-failure-dossier.md:431 (S49: parent bypass, acceptEdits or auto overrides the child's mode; protection from v2.1.267; inline MCP trust check from v2.1.238). Verified on 2.1.327: nesting depth default 3 (chunk-ja5z738t.js@341; https://clawdipedia.cc/extend/subagents/runtime, Documented); concurrency default 20 (chunk-m14bt1pz.js@4499713, limit error chunk-3v1e1y2y.js@79758); nesting error text chunk-3v1e1y2y.js@42475; model inheritance chunk-3v1e1y2y.js@35065 (per-call `model`, then the agent field, then `CLAUDE_CODE_SUBAGENT_MODEL`, then the main model; https://clawdipedia.cc/extend/subagents/frontmatter); `bypassPermissions` applies to a subagent only when the main session has it (same page, `permissionMode`, Documented).

- [ ] **CON-023** MCP servers are not sandboxed; in `claude -p` and SDK runs, project MCP servers from `.mcp.json` load without asking (the poster says docs); pinning a version does not help if the bump is approved without a diff (the postmark-mcp bad line was only in 1.0.16).
  Basis: cited.
  Source: external/2026-10-22/reddit.com-r-claudeai-comments-1xaqse6-the-agent-was-almost-never-the-w-20261022T012322Z.md:71 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xaqse6/the_agent_was_almost_never_the_way_in_i_went/>); external/please-use-me-often/agent-failure-dossier/judged/tool.jsonl:58.

- [ ] **CON-024** `CLAUDE_CODE_SCRIPT_CAPS` caps substring counts in Bash text, acts only with `CLAUDE_CODE_SUBPROCESS_ENV_SCRUB`, and forces default permission mode. Verified on 2.1.327 with a correction: `CLAUDE_CODE_SCRIPT_CAPS` is read at chunk-57bg7pbc.js@8282 and the cap check (`Script call limit exceeded...`) at chunk-57bg7pbc.js@8656 and @8992 returns early unless the scrub flag is true (`CLAUDE_CODE_SUBPROCESS_ENV_SCRUB`, chunk-57bg7pbc.js@6840). The forced default mode comes from the scrub flag, not from SCRIPT_CAPS: chunk-rthqjjhy.js@4018 and chunk-7at7cxxb.js@13901 ("Permission mode forced to default - CLAUDE_CODE_SUBPROCESS_ENV_SCRUB is set"). Docs: https://clawdipedia.cc/configure/env-vars/tools-and-bash (SCRIPT_CAPS Documented; SUBPROCESS_ENV_SCRUB Documented and Differs).
  Basis: measured.
  Source: openspec/specs/setup/spec.md:379.

- [ ] **CON-025** `permissions.defaultMode` set to `bypassPermissions` or `auto` is honoured only from policy, user and flag (`--settings`) settings; project and local settings are ignored with the warning "only policy/user/flag settings may grant bypass mode (projectSettings and localSettings are repo-controllable)" (corrected on 2.1.327: chunk-rthqjjhy.js@7033 for bypass, @7759 for auto; a widening guard for the agent view's inherited mode at @7439). Other modes are not restricted by that check (chunk-ja5z738t.js@304335 and @304686).
  Basis: measured.
  Source: openspec/changes/2-1-325-rearchitecture/design.md:105.

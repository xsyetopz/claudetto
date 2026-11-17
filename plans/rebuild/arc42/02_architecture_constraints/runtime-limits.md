# Runtime Limits

- [ ] **CON-022** Subagents: the parent's bypassPermissions, acceptEdits or auto mode overrides the child's mode; protection against a child selecting bypassPermissions needs v2.1.267 or later; inline MCP servers in project agent files lacked the trust check before v2.1.238; a subagent with no model inherits the main model; a session holds 20 concurrent subagents and 3 nesting levels.
  Basis: cited, reported.
  Source: unresolved: the threads behind plan tags F:297, I:172, G:160 were not located by grep in external/.

- [ ] **CON-023** MCP servers are not sandboxed; in `claude -p` and SDK runs, project MCP servers from `.mcp.json` load without asking (the poster says docs); pinning a version does not help if the bump is approved without a diff (the postmark-mcp bad line was only in 1.0.16).
  Basis: cited.
  Source: external/2026-10-22/reddit.com-r-claudeai-comments-1xaqse6-the-agent-was-almost-never-the-w-20261022T012322Z.md:71 (url: https://www.reddit.com/r/ClaudeAI/comments/1xaqse6/the_agent_was_almost_never_the_way_in_i_went/); external/please-use-me-often/agent-failure-dossier/judged/tool.jsonl:58.

- [ ] **CON-024** `CLAUDE_CODE_SCRIPT_CAPS` caps substring counts in Bash text, acts only with `CLAUDE_CODE_SUBPROCESS_ENV_SCRUB`, and forces default permission mode. In claude 2.1.326 both variables are present (`chunk-wqz933wn.js@8270` reads `CLAUDE_CODE_SCRIPT_CAPS`; `chunk-qh68ejtf.js@38227` reads `CLAUDE_CODE_SUBPROCESS_ENV_SCRUB`; code search); the coupling and the forced default mode are unverified in 2.1.326.
  Basis: measured.
  Source: openspec/specs/setup/spec.md:379.

- [ ] **CON-025** `permissions.defaultMode` is user-settings only (project and local settings cannot set it; `--settings` accepts it). In claude 2.1.326 the setting is present (`chunk-m33vdkhs.js@197263`, code search); the user-settings-only rule is unverified in 2.1.326.
  Basis: measured.
  Source: openspec/changes/2-1-325-rearchitecture/design.md:105.

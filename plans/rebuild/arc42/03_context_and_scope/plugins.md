# plugins

## Plugins And Connectors

- [ ] **CTX-431** Poster claim, unmeasured: the superpowers plugin loads about 22k tokens before the first prompt, and cost per turn grows 5x-20x once context passes 200k.
  Basis: reported, poster claims, unmeasured.
  Source: external/2026-10-22/reddit.com-r-claudecode-comments-1ubfy7y-whats-really-the-big-deal-with-20261022T122113Z.md:122 (url: https://www.reddit.com/r/ClaudeCode/comments/1ubfy7y/whats_really_the_big_deal_with_subagentdriven/).

## Plugins And Connectors

- [ ] **CTX-432** Skill use in the user's sessions, by workflow: apply 10 Skill calls and 5 slash, explore 7, propose 6, update 6, verify 3 slash, archive 2, sync 0 (folded into archive)
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/design.md:182.

- [ ] **CTX-433** Upstream OpenSpec issues #2163, #2033, and #2017 have no test or code in upstream 1.16.0 (`grep -rn "#<n>\b" test src CHANGELOG.md docs` finds none). #2017 (archive loses frontmatter and tables) does not occur because `mergeSpec` keeps both; #2163 does not apply because archive reads `specs/<capability>/spec.md` by path; #2033 is an exploration
  Basis: measured, by grep and probe.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/parity.md:437.

## Plugins And Connectors

- [ ] **CTX-434** One solo user measured the cost of relaying prompts between agents: 257 relay prompts across about 20 terminals in one week, with a median of 11 minutes before an agent finish was noticed.
  Acceptance: The fact holds as the poster counted it; it is a user count, not a claudetto measurement. Verification: inspection.
  Basis: reported, one user (self-count). Status: unchecked: a fact about Claude Code or the machine, with no baseline code to check.
  Source: external/2026-10-30/reddit.com-r-claudeai-comments-1xc8eg5-running-many-claude-code-agents-20261029T123926Z.md:31 (url: https://www.reddit.com/r/ClaudeAI/comments/1xc8eg5/running_many_claude_code_agents_without/).

## Plugins And Connectors

- [ ] **CTX-435** Claude web search is a server-side tool: the model writes the query, Anthropic runs it and returns URLs and snippets with no ranking, and the model decides on its own when to search. Anthropic has not documented the backend; Brave Search and turbopuffer are on its subprocessor list, so a meaning-based own index is inferred.
  Acceptance: The fact is unverified in 2.1.326; Claude's own account of its engine is a guess. Verification: probe.
  Basis: reported and inferred. Status: unchecked: a fact about Claude Code or the machine, with no baseline code to check.
  Source: external/2026-10-30/reddit.com-r-claudeai-comments-1xf6n0i-which-search-engine-does-claude-20261029T172437Z.md:37; external/2026-10-30/reddit.com-r-claudeai-comments-1xf6n0i-which-search-engine-does-claude-20261029T172437Z.md:39; external/2026-10-30/reddit.com-r-claudeai-comments-1xf6n0i-which-search-engine-does-claude-20261029T172437Z.md:65 (url: https://www.reddit.com/r/ClaudeAI/comments/1xf6n0i/which_search_engine_does_claude_use/).

- [ ] **CTX-436** Search quality reports: Exa beat Brave in one user's benchmark; Claude web search is US-focused and weak for non-US product, tax and law queries; Gemini is better on obscure documents; Firecrawl is faster, with a query dashboard and a scrape-to-Markdown function.
  Acceptance: The fact is unverified in 2.1.326; anecdotal, not a benchmark claudetto owns. Verification: probe.
  Basis: reported, anecdotal. Status: unchecked: a fact about Claude Code or the machine, with no baseline code to check.
  Source: external/2026-10-30/reddit.com-r-claudeai-comments-1xf6n0i-which-search-engine-does-claude-20261029T172437Z.md:109; external/2026-10-30/reddit.com-r-claudeai-comments-1xf6n0i-which-search-engine-does-claude-20261029T172437Z.md:93; external/2026-10-30/reddit.com-r-claudeai-comments-1xf6n0i-which-search-engine-does-claude-20261029T172437Z.md:146; external/2026-10-30/reddit.com-r-claudeai-comments-1xf6n0i-which-search-engine-does-claude-20261029T172437Z.md:119 (url: https://www.reddit.com/r/ClaudeAI/comments/1xf6n0i/which_search_engine_does_claude_use/).

## Plugins And Connectors

- [ ] **CTX-437** The Gmail connector rewrites every URL into a google.com redirect, so drafted mails carry defanged links.
  Acceptance: The fact holds as one author reports it. Verification: probe.
  Basis: reported, one author. Status: unchecked: a fact about Claude Code or the machine, with no baseline code to check.
  Source: external/2026-10-30/reddit.com-r-claudeai-comments-1xhmtya-i-used-claude-code-to-audit-21k-20261029T124002Z.md:37 (url: https://www.reddit.com/r/ClaudeAI/comments/1xhmtya/i_used_claude_code_to_audit_21k_product_hunt/).

## Plugins And Connectors

- [ ] **CTX-438** claudetto shall note that plugin modules load before `settings.read` answers, so a mod cannot disable a built-in plugin; setup writes `enabledPlugins: false` for unused built-in plugins, and the binary registers claude-platform without the `cc-plugin-` prefix. Related to the settled decision that every `@builtin` gets a disable enforced at runtime (user decision, 2026-11-16). A user-tier plugin also cannot refuse a builtin at `plugin.register`: native plugins are judged only by native ones, and user-tier plugins never judge non-user ones (`ruo()`, `chunk-wqb2b4v0.js@4661039`, claude 2.1.325 binary).
  Acceptance: unverified in 2.1.326. Verification: inspection. A probe plugin cannot block a builtin. Verification: inspection.
  Basis: cited. Status: partial at 088a227c (settings.ts:93 enabledPlugins).
  Source: openspec/specs/setup/spec.md:214; plugins/claudetto/hooks/features/setup/settings.ts:93@088a227c; `chunk-wqb2b4v0.js@4661039` (claude 2.1.325 binary) (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:5290).

- [ ] **CTX-439** Vanilla launch: the init `plugins` list holds `agents-md`, `privacy`, `plugin-authoring`; traces are the skill text in request 1 and `plugins/store/cc-plugin-agents-md_builtin-*.json`. On 2.1.325 `--settings` with `{"enabledPlugins":{"cc-plugin-plugin-authoring@builtin":false}}` removes `plugin-authoring`, which vanilla finds in request 1; a project `.claude/settings.json` disables agents-md and plugin-authoring; a plugin-shipped `settings.json` does not; `claude plugin list --json` on vanilla prints `[]`.
  Acceptance: rerun of the probe prints the same list. Verification: probe. The probe table reproduces. Verification: probe.
  Basis: measured on claude 2.1.325; not rerun on 2.1.326. Status: missing at 088a227c.
  Source: probe: cc-inspect `cli`, claude 2.1.325, 2026-11-16, as the old plan states (`-p go`, stream-json init event), claude 2.1.325; probe, `claude` 2.1.325, 2026-11-16, cc-inspect `cli` `-p go` (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:4661); (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:5290).

## Plugins And Connectors

- [ ] **CTX-440** Claude Code 2.1.326 registers 14 built-in plugins in `JOe`: always `cc-plugin-sec-default`, `cc-plugin-agents-md`, `cc-plugin-telemetry`, `cc-plugin-privacy`; outside the `local-agent` entrypoint `cc-plugin-plugin-authoring`, `cc-plugin-mods-guide`, `cc-plugin-you-should-know`; outside `local-agent` and tenant entrypoints also `cc-plugin-tips`, `cc-plugin-mermaid`, `cc-plugin-diff`, `claude-platform`, `cc-plugin-claude-test`; `cc-plugin-responsive-mode` there or on `remote`; `cc-plugin-easel` there or on `remote_cowork`. you-should-know loads from `chunk-na8s6d5h.js`. Claude Code 2.1.326 registers 14 builtins, each with the id `<name>@builtin`: `cc-plugin-sec-default`, `cc-plugin-agents-md`, `cc-plugin-telemetry`, `cc-plugin-privacy`, `cc-plugin-plugin-authoring`, `cc-plugin-mods-guide`, `cc-plugin-tips`, `cc-plugin-mermaid`, `cc-plugin-responsive-mode`, `cc-plugin-diff`, `cc-plugin-you-should-know`, `cc-plugin-easel`, `claude-platform`, and `cc-plugin-claude-test`. On 2.1.325 the list was in `chunk-62ne6tjy.js`: `cc-plugin-tips` and `cc-plugin-mermaid` only when not a tenant entrypoint, `cc-plugin-responsive-mode` when not local-agent and not tenant, or remote, and `cc-plugin-diff`, `cc-plugin-easel`, `claude-platform`, `cc-plugin-claude-test` with no condition stated. On 2.1.325 `you-should-know` code is in `chunk-jc1ynf6x.js` with `defaultEnabled:false` and its id constant in `chunk-1wecqt9s.js` (2.1.326: `chunk-na8s6d5h.js`).
  Acceptance: the registration list of the build holds these 14 names. Verification: inspection. Checked in 2.1.326: a string search of the binary finds exactly these 13 `cc-plugin-*` names and `claude-platform`. The registration list in `chunk-62ne6tjy.js` matches. Verification: inspection. Both chunk names appear in the binary. Verification: inspection.
  Basis: read from code (2.1.326 binary); measured (string search)
  Source: chunk-wvm9g54y.js@0-1931 (claude 2.1.326 binary); chunk-qg227pzf.js@78493 (claude 2.1.325 binary; `yY()` read 2026-11-17: `for(let[r,n]of Hr().builtinPlugins)`; the 14 names come from the old plan, not recounted); `chunk-62ne6tjy.js` (claude 2.1.325 binary), read in the session of 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:4661); `chunk-jc1ynf6x.js`, `chunk-1wecqt9s.js` (claude 2.1.325 binary) (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:4661).

- [ ] **CTX-441** A built-in plugin's on/off state in 2.1.326 resolves per plugin: one marked `enabledFromPolicyOnly` reads only policy settings; one marked `enabledFromTrustedSettingsOnly` reads only trusted settings; any other reads `enabledPlugins["<name>@builtin"]`; with no value it takes `defaultEnabled`, else on. `cc-plugin-sec-default` is policy-and-trusted-only; `cc-plugin-privacy` is trusted-only and on by default. So a user-tier `enabledPlugins` entry cannot turn those two off, which a claudetto disable for every `@builtin` plugin must handle at run time. Per builtin, `enabled = v !== undefined ? v === true : (b.defaultEnabled ?? true)` after an isAvailable() gate (named `yY()` in 2.1.325 at chunk-qg227pzf.js@78645 and `LJ()` in 2.1.326 at chunk-qg227pzf.js@78784). `sec-default` is available only on a machine with managed settings or a Team or Enterprise org (2.1.326: `enabledFromPolicyOnly:!0` and `enabledFromTrustedSettingsOnly:!0` at chunk-c6j0a43h.js@31843). `privacy` is `defaultEnabled:!0` (chunk-s29hk2f6.js@11830); `responsive-mode` (chunk-ht4bh06j.js@741) and `you-should-know` (chunk-na8s6d5h.js@89988) are `defaultEnabled:!1`. On 2.1.325 the decision is made by `yY()` (`chunk-yjs2ay06.js@72513`, `@72674`): id `<name>@builtin`; with `enabledFromTrustedSettingsOnly` the trusted settings (`userSettings`, `flagSettings`, `chunk-ztvzn4qc.js@1713`) decide; `responsive-mode` and `you-should-know` are `defaultEnabled:false`.
  Acceptance: the code at the offset matches. Verification: inspection. `enabledFromPolicyOnly` is set for it in the build (2.1.326: `enabledFromPolicyOnly:!0` and `enabledFromTrustedSettingsOnly:!0` at `chunk-c6j0a43h.js@31843`). Verification: inspection. the registrations in the build carry these flags (2.1.326: `privacy` at `chunk-s29hk2f6.js@11830` with `defaultEnabled:!0,enabledFromTrustedSettingsOnly:!0`; `responsive-mode` at `chunk-ht4bh06j.js@741` and `you-should-know` at `chunk-na8s6d5h.js@89988` with `defaultEnabled:!1`). Verification: inspection. A probe with `enabledPlugins["<id>@builtin"]: false` removes the builtin. Verification: probe.
  Basis: read from code (2.1.326 binary); run-time effect of each settings tier is a hypothesis until probed
  Status: missing at 088a227c
  Source: chunk-qg227pzf.js@78645 (claude 2.1.326 binary); chunk-c6j0a43h.js@31843 (claude 2.1.326 binary); chunk-s29hk2f6.js@11830 (claude 2.1.326 binary); chunk-7m8sknrb.js@1765 (claude 2.1.326 binary); chunk-qg227pzf.js@78645 (claude 2.1.325 binary; the three-way choice and `defaultEnabled ?? true` read 2026-11-17; the code also calls `LH(s)` first, which the pseudocode omits); chunk-qg227pzf.js@78645 (claude 2.1.325 binary; `enabledFromPolicyOnly` read, the `sec-default` flag not rechecked); chunk-yjs2ay06.js@72674 (claude 2.1.325 binary; the per-builtin flags are not rechecked); `chunk-yjs2ay06.js@72513` (claude 2.1.325 binary) (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:4661); `chunk-yjs2ay06.js@72674` (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:5290).

- [ ] **CTX-442** you-should-know names its off switch as `/plugin disable cc-plugin-you-should-know@builtin` and reads a typed `/plugin disable` of `cc-plugin-you-should-know`, `suggest-learning`, or `you-should-know`, each with or without `@builtin`, as the off command, recording `off_confirmed` with `offVia: "typed"` once per session.
  Basis: read from code.
  Source: chunk-na8s6d5h.js@16475 (claude 2.1.326 binary); chunk-na8s6d5h.js@36449 (claude 2.1.326 binary).

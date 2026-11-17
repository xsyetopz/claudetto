# system-prompt

## System Prompt And Context

- [ ] **CTX-240** `/statusline` is TUI-only: in `-p` it prints "/statusline isn't available in this environment." with 0 requests. In a pty the stock command sends 'Create an Agent with subagent_type "statusline-setup" ...'. A project or user `commands/statusline.md` or a Mod `command.run` replaces it; `statusline-setup.md` replaces the spawned agent.
  Basis: measured, claude 2.1.318.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:2470.

- [ ] **CTX-241** `/statusline` stock and file routes send 1 main request (57,287 and 56,863 bytes); the Mod `command.run` route sends 0.
  Basis: measured, claude 2.1.318.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:2581.

- [ ] **CTX-242** The stock `/statusline` first subagent request alone is 20,234 bytes (system 15,153, 2 tools). With `amod` withholding `statusline-setup`, the baseline pass-through gives "Agent type 'statusline-setup' not found".
  Basis: measured, claude 2.1.318.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:2966.

## System Prompt And Context

- [ ] **CTX-243** On 2.1.326 these flags exist (checked: `code` search of 2.1.326 finds each name in the CLI option lists): `--system-prompt`, `--system-prompt-file`, `--append-system-prompt`, `--append-system-prompt-file`, `--append-subagent-system-prompt`, `--exclude-dynamic-system-prompt-sections`, `--system-prompt-snapshot <on|off>`; the same lists also hold `--append-subagent-system-prompt-file` and `--plan-mode-instructions`; `autoMode` is present (chunk-m33vdkhs.js@183304). Which flags are hidden in `--help` was recorded on 2.1.325 (`-file` forms and `--append-subagent-system-prompt` hidden) and is unverified in 2.1.326. The last two flags of the first list are cache-related and not mentioned in the input; no repo use found.
  Acceptance: `claude --help` on 2.1.326 lists the visible flags. Verification: probe.
  Basis: measured. Status: missing at 088a227c (no repo use of the two cache flags).
  Source: probe on claude 2.1.325, per the old plan; chunk-eafmz4at.js@787, chunk-eafmz4at.js@4352 (claude 2.1.326 binary); plugins/ grep at 088a227c for `system-prompt-snapshot` returned no line.

## System Prompt And Context

- [ ] **CTX-244** The `/statusline` edit text is 323 characters and named `@~/.claude/settings.json`, so `CLAUDE_CONFIG_DIR` pointed it at the HOME file while bare `/statusline` wrote the configured one. The `/init` interview text shrank from 1,592 to 1,144 characters (measured).
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:145.

## System Prompt And Context

- [ ] **CTX-245** Tool choice degrades past 30-50 tool definitions in the system prompt (Anthropic guide, as relayed); the fix is grouping tools by user intent and deferred tool search. Two commenters report wrong-tool picks at about 40 tools, fixed by grouping or splitting by job.
  Basis: cited as relayed; commenters reported.
  Source: external/2026-10-25/reddit.com-r-claudeai-comments-1xdwquj-anthropics-new-guide-oct-22-argu-20261024T061351Z.md:36 (url: https://www.reddit.com/r/ClaudeAI/comments/1xdwquj/anthropics_new_guide_oct_22_argues_most_agents/).

- [ ] **CTX-246** A tool vendor says an MCP server serving 90 tools costs about 24,000 tokens of schema on every turn, under 1,000 with a six-tool front door; an older CLAUDE.md policy "always use the index first" burns extra turns on jobs that did not need it.
  Basis: vendor claim, reported, unmeasured.
  Source: external/2026-10-26/reddit.com-r-anthropic-comments-1x7i9v1-i-went-from-exhausting-claude-c-20261026T064441Z.md:160 (url: https://www.reddit.com/r/Anthropic/comments/1x7i9v1/i_went_from_exhausting_claude_codes_weekly_limits/).

- [ ] **CTX-247** Anthropic cut Claude Code's own system prompt for newer models by over 80%.
  Basis: cited (guide, relayed second-hand by the poster).
  Source: external/2026-10-25/reddit.com-r-claudeai-comments-1xdwquj-anthropics-new-guide-oct-22-argu-20261024T061351Z.md:37 (url: https://www.reddit.com/r/ClaudeAI/comments/1xdwquj/anthropics_new_guide_oct_22_argues_most_agents/).

- [ ] **CTX-248** A commenter says the API model migration guide states that for Opus 5+ the model is more autonomous, so give fewer and less restrictive instructions; two commenters say deleting old .md files or CLAUDE.md improved Opus 5.5.
  Basis: cited from the guide by one commenter, not fetched; the deletion is anecdotal.
  Source: external/2026-10-25/reddit.com-r-claudeopus-comments-1xbxewx-after-being-on-opus-55-for-so-20261024T141009Z.md:127 (url: https://www.reddit.com/r/Claudeopus/comments/1xbxewx/after_being_on_opus_55_for_so_long_i_forgot_how/).

- [ ] **CTX-249** CLAUDE.md loads into every sub-agent, and custom subagents reload the whole file on every spawn, so each line costs context in every child and constrains it; subagents inherit the main session's effort unless frontmatter pins model and effort. One user culled CLAUDE.md by 50%, moved rules to hooks then skills, and saw a noticeable difference.
  Basis: reported, one user plus one commenter (the subagent-reload and effort-inheritance claim is unverified).
  Source: external/2026-10-25/reddit.com-r-claudeai-comments-1xdwquj-anthropics-new-guide-oct-22-argu-20261024T061351Z.md:94 (url: https://www.reddit.com/r/ClaudeAI/comments/1xdwquj/anthropics_new_guide_oct_22_argues_most_agents/); external/2026-11-10/reddit.com-r-claudecode-comments-1xrutks-how-to-keep-costs-down-20261110T100242Z.md:67 (url: https://www.reddit.com/r/ClaudeCode/comments/1xrutks/how_to_keep_costs_down/).

- [ ] **CTX-250** After compaction Claude Code re-injects the bodies of skills actually invoked, capped at 5,000 tokens per skill and 25,000 total, oldest dropped first, truncating from the start of the file; put the stay-on rule in the first lines and keep the body short.
  Basis: cited (docs link context-window#what-survives-compaction).
  Source: external/2026-10-28/reddit.com-r-claudeai-comments-1xfqg0c-how-do-you-keep-a-skill-active-a-20261028T060802Z.md:139 (url: https://www.reddit.com/r/ClaudeAI/comments/1xfqg0c/how_do_you_keep_a_skill_active_after_context/).

- [ ] **CTX-251** Post-compact re-injection through a hook is chunked to stay under Claude's roughly 10k-character additionalContext limit, and can arrive mid-turn as the agent uses tools.
  Basis: reported, from a pasted model-generated description of a third-party setup, not probed.
  Source: external/2026-10-25/reddit.com-r-claudecode-comments-1xd73jn-compactions-vs-handoffs-lets-s-20261023T165046Z.md:245 (url: https://www.reddit.com/r/ClaudeCode/comments/1xd73jn/compactions_vs_handoffs_lets_settle_this_right/).

- [ ] **CTX-252** Raw Claude Code requests are mostly tool definitions, not the user's code or conversation; ctrl+o shows only the conversation, not the system prompt and tools sent with every message.
  Basis: reported, one user (tool claude-discover). Status: not applicable (outside fact).
  Source: external/2026-11-03/reddit.com-r-claudecode-comments-1xlbuq6-forget-the-usual-claude-tips-w-20261102T184441Z.md:249,257 (url: https://www.reddit.com/r/ClaudeCode/comments/1xlbuq6/forget_the_usual_claude_tips_what_are_the_strange/).

- [ ] **CTX-253** Disable unused plugins and skills; each costs tokens.
  Basis: reported. Status: not applicable (outside fact).
  Source: external/2026-11-03/reddit.com-r-claude-comments-1xlrxh9-new-to-claude-any-tips-for-saving-20261102T140340Z.md:166 (url: https://www.reddit.com/r/claude/comments/1xlrxh9/new_to_claude_any_tips_for_saving_tokens/).

## System Prompt And Context

- [ ] **CTX-254** Claude Code puts the account email in the system prompt (issue anthropics/claude-code 81138 cited), and a commenter reports it steering output (default timezone set to Sweden from a Swedish surname). The mods API removes a system-prompt section with on('prompt.section', {name}, () => ({text:null})) and names sections 'pronouns' and 'statusline-setup'; ccglass audits request logs. The harness system prompt also carries a pronoun rule (default they/them, never infer pronouns from a name) that spends tokens in every session; commenters report removing it, the account email, and the GitHub username with a session-start hook or mod (the pronoun quote is not verified in this thread).
  Basis: reported. Status: not applicable (outside fact).
  Source: external/2026-11-06/reddit.com-r-claudecode-comments-1xhqvzn-comment-19rsjcqyuqin7-20261106T080754Z.md:53,136,143,147-149,490 (url: https://www.reddit.com/r/ClaudeCode/comments/1xhqvzn/comment/19rsjcqyuqin7/?context=3); external/2026-11-06/reddit.com-r-claudecode-comments-1xorv25-woke-30-is-truly-back-20261106T080403Z.md:158-160,184 (url: https://www.reddit.com/r/ClaudeCode/comments/1xorv25/woke_30_is_truly_back/).

- [ ] **CTX-255** A commenter quotes harness prompt lines that say the opposite of a re-engagement hook: 'End your turn when the request is done or nothing is left that you can do without the user'; 'When one part of a task is blocked ... finish everything that does not depend on the stuck part, and open your final message with what is stuck'; 'When you have enough information to act, act'.
  Basis: reported, quote unverified. Status: not applicable (outside fact).
  Source: external/2026-11-10/reddit.com-r-claudeai-comments-1xqlgno-agents-knowingly-fail-to-complet-20261110T093545Z.md:282-291 (url: https://www.reddit.com/r/ClaudeAI/comments/1xqlgno/agents_knowingly_fail_to_complete_tasks_in_order/).

## System Prompt And Context

- [ ] **CTX-256** Running claude -p showed build and gh tools injecting about 70% of one Rust project's context; the user is removing most of it.
  Acceptance: The fact holds on claude 2.1.326 (unverified in 2.1.326); a probe of claude -p on a build-tool project shows the injected share. Verification: probe.
  Basis: reported, one user. Status: unchecked: a fact about Claude Code or the machine, with no baseline code to check.
  Source: external/2026-10-28/reddit.com-r-claudecode-comments-1xgxv58-claude-max-20x-weekly-depleted-20261028T060713Z.md:908 (url: https://www.reddit.com/r/ClaudeCode/comments/1xgxv58/claude_max_20x_weekly_depleted_in_less_than_25/).

## System Prompt And Context

- [ ] **CTX-257** Default compose sections on Opus, in order, with bytes: lean_body 1,229 (shared), then session pronouns 357, action_caution 520, session_guidance 163, memory 2,142, env_info_simple 620, context_management 280, act_dont_rederive 277, original_games 265 (Opus only). Haiku adds heron_brook 2,790 and total_tokens 49. Compose cannot replace system[0] (74 B), system[1] (62 B), or the 8.1 KB system-role message in messages[1].
  Basis: measured (claude 2.1.323).
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/probes.md:16; openspec/changes/archive/2026-11-16-2-1-323/research/probes.md:17.

- [ ] **CTX-258** A `prompt.compose` list that puts a session section before a shared section is skipped as a whole hook.
  Basis: cited (type file comment).
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/probes.md:18.

- [ ] **CTX-259** Compose input keys are model, promptModel, tools, outputStyle, traits, surfaces. They have no subagent type field.
  Basis: measured.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/probes.md:131; openspec/changes/archive/2026-11-16-2-1-323/research/probes.md:132; openspec/changes/archive/2026-11-16-2-1-323/research/probes.md:133.

- [ ] **CTX-260** A fresh Haiku session holds system tools 35.6k, MCP tools 16.6k, skills list 5.9k, system prompt 5.2k tokens, so tool schemas outweigh prompt text (one poster).
  Basis: reported, one poster.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/reddit-1.md:8; external/2026-10-12/export-claude code 66k system prompt.jsonl:2 (url: https://www.reddit.com/r/ClaudeCode/comments/1x0fli2/claude_code_66k_system_prompt/).

- [ ] **CTX-261** A custom system prompt gave `@lru_cache` in 93% of runs against 53% with the default (456 API calls). An over-strict anti-markdown text made Claude refuse lists.
  Basis: reported (small study).
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/reddit-1.md:9 (url: https://www.reddit.com/r/ClaudeAI/comments/1shogc4/i_tested_whether_a_custom_system_prompt_for/.)

- [ ] **CTX-262** Anthropic removed over 80% of Claude Code's system prompt for Opus 5 with no loss on coding evals.
  Basis: reported (vendor claim, relayed).
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/reddit-1.md:10 (url: https://www.reddit.com/r/ClaudeAI/comments/1wnl999/claudemd_for_opus_55_based_on_anthropics_official/.)

- [ ] **CTX-263** Vercel removed 80% of its tools and success rose from 80% to 100% at half the tokens. Machine-written context lowered success.
  Basis: reported (vendor, relayed).
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/reddit-1.md:36 (url: https://www.reddit.com/r/ClaudeAI/comments/1wpzynz/i_analyzed_246_repos_and_57_papers_on_agent/.)

- [ ] **CTX-264** A 450-run skill test found six of nine popular skills no better than a same-length placebo. No skill beat no skill on cost, and placebo length alone added 2-16% cost. A debugging skill was never auto-invoked in 16 runs.
  Basis: reported.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/reddit-1.md:43; openspec/changes/archive/2026-11-16-2-1-323/research/reddit-1.md:44 (url: https://www.reddit.com/r/ClaudeAI/comments/1wz4rfz/i_gave_the_9_most_popular_claude_code_skills_a/.)

- [ ] **CTX-265** Reviews should quote the lines they judge. "Tell it this is ITS CODEBASE" matches the Fable ownership line.
  Basis: reported (anecdote).
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/reddit-1.md:52; openspec/changes/archive/2026-11-16-2-1-323/research/reddit-1.md:53.

- [ ] **CTX-266** The "prompt injection" with `<system-reminder>` was Claude Code's own commit-attribution instruction. The `attribution` settings object controls it, and the tool-result channel delivers it.
  Basis: reported (docs plus anecdote).
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/reddit-2.md:32 (url: https://www.reddit.com/r/ClaudeAI/comments/1wemrgz/why_i_am_receiving_a_prompt_injection_with/.)

- [ ] **CTX-267** Claude Code injects the customer's email address into the system prompt. A claude-mods plugin can block it and lower the token count.
  Basis: reported (anecdote, issue linked).
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/reddit-2.md:35 (url: https://www.reddit.com/r/ClaudeAI/comments/1xl0mvp/claude_just_leak_its_internal_cds/); openspec/changes/archive/2026-11-16-2-1-323/research/reddit-2.md:181; external/2026-11-06/reddit.com-r-claudecode-comments-1xhqvzn-comment-19rsjcqyuqin7-20261106T080754Z.md:35 (url: https://www.reddit.com/r/ClaudeCode/comments/1xhqvzn/comment/19rsjcqyuqin7/?context=3)

- [ ] **CTX-268** The engine adds "<style> output style is active. Remember to follow..." every turn unless the style is default (22,320 `output_style` rows, about 20 tokens each, estimated). Only built-in styles carry `turnReminder`. The plugin style frontmatter allows only name, description, keep-coding-instructions, force-for-plugin, so a plugin style cannot change or empty it.
  Basis: reported (read from `chunk-2x9ma4k7.js`, claude 2.1.325 binary, a module absent from the 2.1.325 install; counted). Status: confirmed in 2.1.326 at `chunk-4h798pp0.js@5833538` (reminder text, with the fallback "Remember to follow the specific guidelines for this style." when `turnReminder` is unset) and built-in styles carrying `turnReminder` at `chunk-4h798pp0.js@1043321`; counts are from 2.1.323 logs.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/defects.md:649.

- [ ] **CTX-269** `silent_turn_reminder` fires when the last 5 assistant messages hold no text, thinking summary, or user-facing tool call (flag `tengu_hushed_lark`). It fires at most 3 times per silent stretch; the timed variant runs at 60 s. Counts: 1,258 rows, up to 155 in one session, about 35 tokens each. A probe showed it fires as designed.
  Basis: measured.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/defects.md:645.

- [ ] **CTX-270** 1,877 `deferred_tools_delta` rows named a failed MCP server 612 times (apple-docs 533 across 35 sessions). Failures appear once per context around each `compact_boundary` and never clear. npm shows `apple-docs-mcp-next` first published 2026-11-11T22:34Z and all failures came before it. 2,908 `prompt_snapshot` rows (about 9,200 chars) cost disk only, because the engine strips them before a request.
  Basis: measured.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/defects.md:651.

- [ ] **CTX-271** The sandbox instructions attachment is 5,490-8,400 chars (1,291 rows, average 7,589). Claude Code lists about 51 write-deny paths and cuts the rest as "and N more", so `sandbox.filesystem` entries cannot grow it past that cap. Other attachments: `invoked_skills` average 5,212 (max 22,526), `skill_listing` 2,989, `output_style_instructions` 2,981. No attachment type repeats more than 6 times in a context.
  Basis: measured.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/defects.md:656.

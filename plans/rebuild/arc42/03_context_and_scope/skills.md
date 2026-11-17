# skills

## Skills

- [ ] **CTX-711** A skill body of 1,500 to 5,000 characters (under 200-500 lines) is the advised size; larger logic goes to `references/` (read on demand), `scripts/` (run with zero LLM tokens), and `assets/`. Discovery costs about 100 tokens per skill. The agentskills.io rules (name 1-64 chars, lowercase, digits, hyphens, no leading, trailing, or double hyphen, matching the folder; description 1-1024; body under 500 lines or 5,000 tokens) are not enforced by Claude Code 2.1.318: name up to 256; folder `dir-a` with `name: Other_Name` is listed as `dir-a`; a folder named `compact` loads as a skill. They are portability rules for claude.ai uploads. The reserved-word list and the naming style advice (domain-action-target, lifecycle prefixes, at most 4 words) have no source. The Gemini skill-name validator line is unsupported
  Basis: measured, fake-API run, 2.1.318; the size and token advice reported from agentskills.io, unverified.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/specific-researches-found-through-gemini-ai-studio.jsonl:45; openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:958; openspec/changes/archive/2026-11-09-release-2-1-319/specific-researches-found-through-gemini-ai-studio.jsonl:101.

- [ ] **CTX-712** The Agent Skills standard (agentskills.io) was donated to the Linux Foundation AAIF. Frontmatter fields: `name`, `description`, `license`, `compatibility`, `metadata`, `allowed-tools`. 70+ platforms support it. Public registries hold over 1.3M skills with low-signal slop, and untrusted skills carry prompt-injection and script-execution supply-chain risk
  Basis: reported, agentskills.io, unverified.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/specific-researches-found-through-gemini-ai-studio.jsonl:68.

## Skills

- [ ] **CTX-713** Claude Code 2.1.318 parses skill frontmatter with `Bun.YAML` (YAML 1.2), so the YAML 1.1 coercions are wrong there: `name: off`, `no`, `yes` stay strings, `0124` becomes 124 (not octal), dates stay strings. The real traps are silent loss: `&x anchor` and `!critical x` eat the first word, `#1 runner` becomes null, `C #code` cuts to `C`, and `allowed-tools [Bash(git log, -n 5), Read]` splits at the comma. Hard failures: a value starting `? ` or `- `, a leading tab on a key line, an unindented continuation. A fallback quotes lines holding `{ } [ ] * & # ! | > % @`, a backtick, or `: `. This corrects the Gemini line that lists the Norway problem, octal, and unquoted `: ` traps
  Basis: measured, probe on bun 1.4.4 and the 2.1.318 binary.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:975; openspec/changes/archive/2026-11-09-release-2-1-319/specific-researches-found-through-gemini-ai-studio.jsonl:124.

## Skills

- [ ] **CTX-714** `skillListingMaxDescChars` defaults to 1536 (binary). It cuts "description - when_to_use" and appends an ellipsis with no stderr warning. It is not a 200 clamp; setting 200 works (fake-API run)
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:876; openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:878.

- [ ] **CTX-715** The skill listing budget in characters is window x bytesPerToken (3, for -5-5 models) x `skillListingBudgetFraction` (0.01, a float), 30,000 on a 1M window; `SLASH_COMMAND_TOOL_CHAR_BUDGET` replaces it. haiku-5-5 reports 980,000 tokens, so 29,400 chars; with 1M disabled the window caps at 200,000, so 6,000 chars, and non-bundled entries are cut to names; `DISABLE_1M_CONTEXT` also shortens the init and security-review descriptions (-134 chars). Over budget, bundled and name-only skills stay and the lowest-ranked go name-only. Rank = usageCount x max(0.5^(days since last use/7), 0.1) from `skillUsage` in `~/.claude.json`, one write per skill per 60 s; a never-used skill loses its description first. With the fraction unset, gate `tengu_typed_pebble` can raise the budget to at most 100,000 (cached value 0 here, so no floor). `skillOverrides` takes on, name-only, user-invocable-only, off. A Gemini line reports the same default 0.01 (reported, v2.1.318 docs, unverified). The empty-session listing is 2,210 tokens (cited, context-budget page, 2.1.305)
  Basis: measured by binary read, 2.1.318.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:882; openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:890; openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1547; openspec/changes/archive/2026-11-09-release-2-1-319/specific-researches-found-through-gemini-ai-studio.jsonl:24.

## Skills

- [ ] **CTX-716** Skill frontmatter on 2.1.318: `background` defaults true (forked skills run in the background unless false); `effort` also accepts an integer; `allowed-tools` takes a space or comma string or a list, and the grant clears at the next message; `agent` defaults to `general-purpose`; `user-invocable: false` only hides the skill from the slash menu and does not reserve it for agent-only use; `disallowed-tools` since 2.1.152. The Gemini list adds `when_to_use` (extra trigger text), `context: fork` with `agent` and `background`, per-skill `model` and `effort`, and `hooks` (v2.1.318 spec, unverified)
  Basis: cited, changelog read 2026-11-04.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:939; openspec/changes/archive/2026-11-09-release-2-1-319/specific-researches-found-through-gemini-ai-studio.jsonl:84.

## Skills

- [ ] **CTX-717** Skill test, 5 runs with and 5 without a skill, same task and model, blind grader: a writing skill that only bans three things took paste-ready email replies from bullet points every time to 5 of 5 clean; a three-reviewer skill scored the same as none at about 14 times the cost; a public GitHub skill tied 8 of 8 against 8 of 8. Skills that carry facts the model cannot know (retail price fields include 7% VAT, so gross-versus-net comparisons are off by 7%) measurably help and are testable against a known number with no grader. In a hook-thread skill test a writing skill that only bans three things beat no skill (5 runs per arm, blind grader), and a debugging skill was never used until the user's own phrase went in its description; the phrase tip is advice from the thread, not a measured result.
  Basis: reported, n=1, small samples, one grader, same family, author-written tests. Status: not applicable (outside fact). reported (thread; 5 runs per arm).
  Source: external/2026-11-03/reddit.com-r-claudeai-comments-1xlfe2l-i-tested-my-agent-skills-with-an-20261102T140719Z.md:29-39,49-51 (url: https://www.reddit.com/r/ClaudeAI/comments/1xlfe2l/i_tested_my_agent_skills_with_and_without_the_one/); openspec/changes/archive/2026-11-16-2-1-323/research/reddit-2.md:166; openspec/changes/archive/2026-11-16-2-1-323/research/reddit-2.md:167.

- [ ] **CTX-718** A skill whose injected shell command exits non-zero fails to load (hence `|| true`); exit code 1 from search and comparison commands like grep is treated as a normal result.
  Basis: reported. Status: not applicable (outside fact).
  Source: external/2026-11-04/reddit.com-r-claudecode-comments-1wpcirc-ccs-most-underrated-feature-dy-20261104T085040Z.md:103-105 (url: https://www.reddit.com/r/ClaudeCode/comments/1wpcirc/ccs_most_underrated_feature_dynamic_context/).

- [ ] **CTX-719** The `!` injection must start a line or follow whitespace; `KEY=!`cmd`` does not run. Injection and skill arguments are Claude Code only (not claude.ai chat, API, or other agentskills hosts).
  Basis: reported. Status: not applicable (outside fact).
  Source: external/2026-11-04/reddit.com-r-claudecode-comments-1wpcirc-ccs-most-underrated-feature-dy-20261104T085040Z.md:108-109 (url: https://www.reddit.com/r/ClaudeCode/comments/1wpcirc/ccs_most_underrated_feature_dynamic_context/).

- [ ] **CTX-720** No hook shows expanded skill contents: UserPromptExpansion shows manual invocations and PreToolUse Skill() shows AI invocations; verify in the session .jsonl.
  Basis: reported. Status: not applicable (outside fact).
  Source: external/2026-11-04/reddit.com-r-claudecode-comments-1wpcirc-ccs-most-underrated-feature-dy-20261104T085040Z.md:112-113 (url: https://www.reddit.com/r/ClaudeCode/comments/1wpcirc/ccs_most_underrated_feature_dynamic_context/).

- [ ] **CTX-721** A SessionStart hook's stdout enters context every session, not only when the skill runs.
  Basis: reported. Status: not applicable (outside fact).
  Source: external/2026-11-04/reddit.com-r-claudecode-comments-1wpcirc-ccs-most-underrated-feature-dy-20261104T085040Z.md:171 (url: https://www.reddit.com/r/ClaudeCode/comments/1wpcirc/ccs_most_underrated_feature_dynamic_context/).

- [ ] **CTX-722** A skill A/B scored 9.6 vs 9.6 because the runner had disabled all skills on both arms; with the skill loaded the writing task scored 10 vs 7. Nothing errors when a skill is not opened, since the agent sees only name and one-line description up front.
  Basis: reported, one poster, 5 runs, blind grader. Status: not applicable (outside fact).
  Source: external/2026-11-10/reddit.com-r-claudeai-comments-1xr9vrf-before-you-ab-test-an-agent-skil-20261110T094754Z.md:35-37 (url: https://www.reddit.com/r/ClaudeAI/comments/1xr9vrf/before_you_ab_test_an_agent_skill_check_the_logs/).

- [ ] **CTX-723** A skill whose frontmatter description contains a colon silently failed to load (agentshot commit 4e53184).
  Basis: reported. Status: not applicable (outside fact).
  Source: external/2026-11-10/reddit.com-r-claudeai-comments-1xr9vrf-before-you-ab-test-an-agent-skil-20261110T094754Z.md:57 (url: https://www.reddit.com/r/ClaudeAI/comments/1xr9vrf/before_you_ab_test_an_agent_skill_check_the_logs/).

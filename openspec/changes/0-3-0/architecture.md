## Zero-Base Question

The user, 2026-10-21: "what is the minimal needed claudetto sitting over claude code v2.1.306 for the install to be heavily optimized for token & cost savings, while taking advantage of every surface that lets claude code be customized/modified without actually modifying the cli.js source code", "retaining shitty architectural decisions and code smells in this repo 'just because it's already there' isn't an option either", and "minimal does not mean reduced capabilities. it means it uses as little code as possible to achieve the most claude code even allows users to modify."

So the design starts from bare Claude Code 2.1.306, not from 0.2.0.
Minimal means the least code for each capability, and the capabilities stay.
For each capability:

1. When a Claude Code setting, env var, flag, or built-in part gives the same result, claudetto sets it and ships no code (`CLAUDE.md`, rule 1, and `.claude/rules/extension-points.md`).
2. Otherwise claudetto ships the capability on the cheapest surface that can do the work, in this order: a settings or env value (0 tokens, no runtime), a plugin file (`agents/`, `skills/`, plugin `settings.json`), a mod hook (in-process), a command hook (a process for each call), and last a prompt or agent hook (a model call for each fire).
3. One version of each capability stays, never two (the user, 2026-10-21: "features get cut off if built-in exists, but if a built-in can be replaced with a cheaper, more effective equivalent, then built-in gets disabled.").
   When a built-in part exists, the claudetto part goes, unless the claudetto part is cheaper and works better.
   Then claudetto keeps its part and turns the built-in part off.
   A part that solves a problem of the built-in part counts as more effective, also when it costs a few more tokens, such as a style with writing rules (the user, 2026-10-21: "there are dozens of problems, and if claudetto can solve them, it will.").
   A capability also goes when the user turns it off (the advisor and CodeGraph, 2026-10-21).
4. Each surface of Claude Code that can cut tokens, requests, turns, or dollars gets a row in `research/matrix/*.md`, so no lever stays unused because nobody looked (fault 48).
5. FAFA, "Fuck Around and Find Out" (the user, 2026-10-21: "if KISS, YAGNI and other paradigms exists, we make up 'FAFA' paradigm.").
   A decision rests on a run, not on a reading: the docs, a thread, or the code name a lever, and a probe decides it.
   The cheapest probe that shows the effect comes first: a stub capture with no model call (`research/probes.md`), then a hook lab, then a paid run only for an effect in the answer of the model.
   A lever is `n/a` or `drop` only after a probe shows no effect or a cost (faults 53, 55, and 56).
   The probes go on until they hit the floor of the software: the point where no documented surface goes lower, and the next step needs a patch of the Claude Code bundle, which the terms forbid (the user, 2026-10-21: "trial-and-error until they hit the actual *software* limit itself").
   Each floor goes into `research/probes.md` with the probe that shows it, such as `ToolSearch` that no hook can defer (`floor`).
   claudetto also ships FAFA to its users: the `claudetto:main` body and the `claudetto:Concise` style tell the model to run the smallest check that decides a claim before it states the claim.

### Surfaces of Claude Code 2.1.306 That Claudetto Uses

| Surface | What claudetto puts there | Cost |
| --- | --- | --- |
| User settings (`~/.claude/settings.json`), written by `claudetto-setup` | `permissions.deny`, `env`, the off switches, `statusLine` | 0 tokens |
| Plugin `settings.json` | `agent: "claudetto:main"`, `subagentStatusLine` (`docs/extend/plugins/manifest.md:39`) | 0 tokens |
| Plugin `agents/` | `main` and the subagent roster (D1) | the body of `main` replaces the default body |
| Plugin `skills/` | the skills of the kept capabilities | the description only, until a call |
| Mod hooks module (`hooks/hooks.json` with one `register`) | the gate (`tool.check`), the `/goal` answer (`command.run`), the agent list (`agent.offer`, `agent.spawn`), text cuts (`prompt.context`, `prompt.attachment`, `tool.describe`), and the in-process parts of the kept capabilities | in-process, 0 tokens |
| Command hooks | none, unless a mod event cannot do the work | a process for each call |
| Prompt or agent hooks | none | a model call for each fire |
| Status line command | `claudetto-statusline` | 0 tokens |

### Verdict for Each 0.2.0 Part

Sizes: lines of `.ts`, `.md`, `.json`, and `.py` in `src/` (measured 2026-10-21 with `find` and `wc -l`).
"Rebuild" means the same capability with less code on the surface in the table, and a test of the capability passes before and after.

| Part | Lines | Verdict | Surface in 0.3.0 | Reason |
| --- | --- | --- | --- | --- |
| `setup` | 791 | rebuild | `bin/claudetto-setup` and one skill | The only route for `permissions`, `env`, and `autoMode`. |
| `guard` | 696 | rebuild | mod `tool.check` and static `deny` rules | Spec `permission-gate`. The print guard goes (F09, F41). |
| `prompt` | 1,430 | rebuild | settings values, and mod rewrites of each built-in text that the agent body does not replace (A16) | The body of `claudetto:main` replaces the system sections (A9, fault 44). The rest of the built-in text is 8,920 characters of attachments and 28,567 characters of tool schemas (`research/vanilla-inventory.md`). |
| `styles` | 35 | rebuild | plugin output style `claudetto:Concise` | It is more effective than the built-in `Concise` style, because it adds the writing rules of claudetto: Chicago title case for headings, and ASD-STE100 or Simple English for prose (the user, 2026-10-21). The built-in style is not selected. |
| `advise` | 705 | drop | `CLAUDE_CODE_DISABLE_ADVISOR_TOOL=1` | The user, 2026-10-21: "advisor is expensive". |
| `goal` | 1,217 | rebuild | one `Stop` check that runs a command | Fault 28, fault 49, and "goal is primitive" (the user, 2026-10-21). A `command.run` hook answers `/goal` in place of the built-in. |
| `decide` | 1,423 | rebuild | mod hook on `AskUserQuestion`, and the Jev check of the gate (D4) | The capability stays for a user with a key. Fault 31: it is off with no key, and 1,423 lines is too large (D7). |
| `handoff` | 1,634 | compare, then rebuild or drop | mod `session.compact` | The built-in compaction summary does the same work. The eval compares both on tokens and on the next turns (fault 25). The cheaper one that keeps the task stays, and the other goes. Used 182 times in the setup of the user (F35). |
| `statusline` | 1,222 | rebuild | status line command | 0 tokens, but too large (D7), with fault 19 and F19 open. |
| `patch` | 349 | drop | the built-in worktree | The built-in worktree branch keeps the changes of the agent, and `ExitWorktree` takes `keep` or `remove` (`docs/reference/tools/agents-and-tasks.md`). |
| `ground` | 521 | rebuild | mod `tool.check` on `Write` and `Edit` | It stops a claim with no source. In this session it resolved `slice.ts` to another file and refused a correct line number, so the rebuild matches full paths. |
| `sembr` | 749 | drop | none | The user chose to remove it in task 3.2. |
| `reply` | 127 | keep | mod hook | Small. |
| `spec` | 170 | rebuild | MiniSpec: the step skills `claudetto:propose`, `claudetto:apply`, `claudetto:verify`, and `claudetto:archive`, and the `minispec` command (D11) | OpenSpec costs 7 skills and 115,816 bytes of skill text in this repository (D10). |
| `dry` | 290 | keep | skill `claudetto:dedupe` (D11) | The description only, until a call. |
| `src/kernel/` | 1,679 | cut to what the kept parts import | - | A file that no part imports goes. |
| `claudetto-codegraph` | 262 | drop | none | The user, 2026-10-21 (A10). |
| `session-hygiene` | 0 | new | mod `tool.call` on `Edit` and `Write`, mod `session.start`, and `$.state` | The user, 2026-10-22 (D12). |
| `claudetto-sessions` | 317 | drop the audit, move the replay into `claudetto-lab` | lab skill | The bundled `/doctor` checks the install, unused extensions, `CLAUDE.md`, hooks, and permissions (`docs/extend/skills-and-commands/bundled-skills.md`), and `/context` counts what loads at the start (`docs/how-it-works/context-budget.md:17`). No built-in replays a hook on past tool calls. |
| `claudetto-lab` | 2,001 | rebuild | skills and scripts | No built-in runs a sandbox session or sizes the requests. Size review in D7. |
| `claudetto-docs` | 78 | keep | skill | Context7 has no built-in. |
| `claudetto-browser` | 1,138 | compare, then rebuild | skill and mod hook | The built-in is Claude in Chrome, which needs the browser extension and adds MCP tool schemas. `agent-browser` runs through `Bash` with a skill body only. The eval confirms the lower cost, and the built-in stays off. |
| `tools/` | 6,404 | cut | - | A script of a dropped part goes with it. |

### Core and Add-ons

Jev decided where each kept part ships (the user, 2026-10-22: "decide which parts become add-ons, and which are core claudetto, for 0.3.0, by asking Jev").
Method: one `claudetto-decide ask` request with one `choice` question (`core` or `addon`) for each part, and the facts of the verdict table above as the state, with no file.
A pick passes at a confidence of 0.65 or more, the bound of `decide` for 2 options (`MIN_CONFIDENCE`, `MIN_MARGIN`).
The parts that go (`advise`, `patch`, `claudetto-codegraph`) were not asked.
`sembr` got `core`, and then the user chose to remove it in task 3.2.

| Part | Jev pick | Confidence | Result |
| --- | --- | --- | --- |
| `setup`, `guard`, `prompt`, `styles`, `goal`, `handoff`, `statusline`, `ground`, `reply` | `core` | 1.00 | core |
| `decide` | `core` | 0.98 | core |
| `spec` | `core` | 0.94 | core |
| `browser` | `addon` | 1.00 | add-on `claudetto-browser` (second request) |
| `dry` | `core` | 0.88 | core (second request) |
| `docs` | `addon` | 0.94 | add-on `claudetto-docs` (second request) |
| `lab` | `addon` | 1.00 | add-on `claudetto-lab` (second request) |

The first request gave `browser` 0.62, `dry` 0.28, `docs` 0.08, and `lab` 0.06, under the bound.
So a second request asked again about these 4 parts only (the user, 2026-10-22: "ask jev, again. describe what these [do], then ask what they think").
Its state described each part: what it does, the outside binary or account that it needs, its start cost in characters, and who needs it.

`handoff` ships in core only if it wins the eval against the built-in compaction (verdict table).

The layout of the source is decision A14: `plugins/` is the source.

## Components

- `agents` (new slice):
  - Ships plugin agent files, each with `model`, `effort`, `tools`, `maxTurns`, and `omitClaudeMd: true` (`research/claude-code.md`, section 1).
  - Registers an `agent.offer` hook that hides the built-in types (`general-purpose`, `Explore`, `Plan`, `claude`, provider `{plugin:"engine"}`), because a plugin agent cannot shadow a built-in name.
  - Registers an `agent.spawn` hook that maps a call with no `subagent_type` to the claudetto default agent, with `.catch`.
- `guard` (changed):
  - Replaces the 92 `rm` `ask` rules (`slices/prompt/domain/rm-ask.ts`) with one `tool.check` hook on `Bash`, `Read`, `Grep`, `Glob`, `Edit`, and `Write`.
    The hook decides by whether the bytes can come back: it allows a delete that `git` or a rebuild can undo, asks a person for a loss for good, and denies system tampering and the reads of secrets (spec `permission-gate`, D4).
  - Each guard has a `.catch` that refuses, because a throwing hook fails open.
- `main` agent (new, in the `agents` slice): the plugin `settings.json` sets `agent: "claudetto:main"`, so each session runs as that agent (the user, 2026-10-21).
  - Its body replaces the default body and the session sections (`docs/prompts/agent-main.md`: 5,499 characters less).
  - It is the minimal base, and claudetto adds only the text that a fault or a test needs over it.
  - Mod hooks then replace or drop each default text that the agent route leaves: the environment message (the `environment`, `model`, and `date` attachments of `prompt.attachment`, `research/probes.md` batch 8), reminders and attachments (`prompt.attachment`), tool descriptions (`tool.describe`), the agent and skill lists (`agent.offer`, `skillOverrides`), and the attribution text (`attribution.text`) (the user, 2026-10-21).
  - No default text stays where a lever exists. A documented, undocumented, gated, or experimental lever is used when it cuts tokens, requests, or turns, and a test pins its effect (the user, 2026-10-21). The full list is in `research/vanilla-inventory.md`.
  - `CLAUDE_CODE_SIMPLE=1` is not the base, because it stops plugins, hooks, and skills (findings, constraint after fault 44).
- `prompt` (rebuilt): the settings snippet, and the mod rewrites of A16.
  - The rewrites of the system sections go, because the agent body replaces those sections. `prompt.compose` stays only as the fallback when the agent route does not apply.
  - The snippet stops setting `sandbox.enabled: true` and turns auto mode off.
  - It adds the levers of the lever table that have a measured or a stated saving, and drops each lever that only adds text.
  - The texts stop telling Claude to wait for an agent (`prompts/tool-agent.md:9`), stop allowing a skipped check (`prompts/verify-line.md`), and name `AskUserQuestion` for a decision.
- `setup` (changed): merges the snippet, and removes the 0.2.0 keys that 0.3.0 drops (`cleanup.ts`: `cleanAutoMode`, `cleanLegacyKeys`).
  - It sets `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS` from the plan: Pro 2, Max 5x 4, Max 20x 6 (the user, 2026-10-21).
    It reads the plan from `oauthAccount.organizationRateLimitTier` in `~/.claude.json` (this machine: `default_claude_max_20x`). The key is not in the docs.
  - It offers no code-intelligence tool (the user, 2026-10-21).
- Slices on trial: `decide`, `advise`, `goal`, and each control that records no incident (findings, faults 24, 28, 31, and 32).
  The design keeps each one only with an incident, a measured saving, or a user need, and removes the others.
- Add-on plugins: `claudetto-codegraph` goes, with its source, tests, and wiki page (the user, 2026-10-21).
  The other add-ons change only where a fault needs it.

## Data and Interfaces

- Settings snippet: the JSON that each `slice.settings` contributes, merged and written by `claudetto-setup` into a settings file.
  It is the only route for `permissions`, `env`, and `autoMode`, because a plugin `settings.json` applies only `agent` and `subagentStatusLine` (`docs/extend/plugins/manifest.md:39`).
- Plugin `settings.json`: `{"agent": "claudetto:main", "subagentStatusLine": ...}`, the only two keys that a plugin can set.
- Plan tier: `~/.claude.json` `oauthAccount.organizationRateLimitTier` and `organizationType`, read by `claudetto-setup` only.
- Agent files: Markdown with frontmatter in `src/plugins/claudetto/slices/agents/agents/`, generated into `plugins/claudetto/agents/`.
  Their type is `claudetto:<file>`.
- Mod hooks: `hooks/hooks.json` with one module that exports `register(on, options)`.
  The new events are `agent.offer`, `agent.spawn`, and `tool.check`.
  `tool.check` returns `{decision, reason, decider}`.
- Evals: each hook entry keeps its `evals` block (`requests`, `tokens`, `blocks`, and the test names for `allow` and `text`).
- Findings and tests: each fault maps to a test in `tests/claudetto/<slice>/` that fails on 0.2.0.

## Constraints

- Claude Code 2.1.306 is the target, and no patch of the CLI or its npm package (`CLAUDE.md`).
- Mods load only when the server flag `tengu_plugin_hooks_modules` is on, and `--safe-mode`, `--bare`, and `disableAllHooks` stop them (`docs/extend/mod-api/index.md`).
  So the gates for `.env`, `/`, and `~` also stay as static `deny` rules in the snippet.
- A plugin agent ignores `permissionMode`, `hooks`, and `mcpServers` (`docs/extend/subagents/frontmatter.md`).
- `CLAUDE_CODE_EFFORT_LEVEL` wins over each agent `effort`, so the snippet must not set it.
- A change to the tool list breaks the prompt cache (a cache write of 15,925 tokens, `docs/how-it-works/context-budget.md`).
  So the tool list is the same at each start, and no hook changes it during a session.
- Keep `ToolSearch` on: a deny costs 15,898 tokens.
- The sandbox stays off by default, and claudetto writes no `sandbox` key (the user, 2026-10-21).
- Edit `src/` and run `just generate`, and `just docker check` passes before done.
- Each bound stays in its `limits.ts` or `src/kernel/budget.ts`.

## Decisions

- A1: The static `deny` list and `tool.check` replace the auto-mode classifier.
  Reason: the classifier prompt is about 19k to 35k tokens for each review, and a rule or a hook costs 0 tokens (`research/claude-code.md`, section 2).
- A2: A plugin agent file, not `$.agent.register`, defines each agent.
  Reason: the file route is documented for plugins, and whether a registered spec honors more keys is unverified (`research/claude-code.md`, open items).
- A3: `agent.offer` hides the built-in agents, and the snippet also denies them with `Agent(<name>)`.
  Reason: the hook works from inside the plugin, and the deny works when mods do not load.
- A4: Delete the `rm` `ask` globs, and do not try to make them narrower.
  Reason: an `ask` rule applies before each `allow`, so no "always allow" can clear it (`research/claude-code.md`, section 2).
- A5: `decider:"person"` for the gates that need a person.
  Reason: it hides the "always allow" row, so a click cannot turn a gate into an `allow` rule.
- A6: `/claudetto:setup` stops offering `codegraph install`, and offers no code-intelligence tool in its place.
  Reason: the prompt hook injected 9,287 characters into one measured prompt.
  An A/B test gave the same recall with and without a graph, and GitNexus adds more hooks and tools (findings, fault 18).
  Claude Code recommends the official LSP plugins when they apply, or the user installs them (the user, 2026-10-21).
- A8: claudetto ships no output compressor and does not lower `bashOutputMaxChars` or `MAX_MCP_OUTPUT_TOKENS` with no paired measurement.
  Reason: a compressor of `Bash` output cost `+7.6%` in a paired test of 425 trials, because of re-reads and extra turns (findings, fault 18).
- A9: A main-thread agent is the base of the prompt, and the rewrites of the system sections of 0.2.0 go.
  Reason: one agent body replaces each section, also when mods do not load (the user, 2026-10-21, findings, fault 44).
  Mod hooks replace the rest of the default text, and the route with hooks only was rejected because the whole default prompt comes back when mods do not load (the user, 2026-10-21).
- A12: An undocumented or experimental lever is allowed when it cuts cost, with a test that fails when Claude Code changes it.
  Reason: the user, 2026-10-21 ("both documented/undocumented/experimental get taken advantage of").
- A10: `claudetto-codegraph` goes (the user, 2026-10-21).
  Reason: no measured saving, a cost on each prompt (faults 18, 46, and 47), and Claude Code recommends the LSP plugins.
- A11: The subagent cap follows the plan tier, and setup writes it.
  Reason: a fixed `2` stopped a third agent in this session (the user, 2026-10-21).
- A13: When claudetto can do the work of a built-in part for less, claudetto ships its own tool and disables the built-in part.
  Reason: the user, 2026-10-21 ("if claudetto can provide a tool that does the same for cheaper, then it will provide so, and disables the built-in ones").
  `research/replace-matrix.md` holds the decision for each built-in part (findings, fault 48).
- A14: `plugins/` becomes the source, and the slice layer and the code generator go (the user chose "plugins/ is source", 2026-10-21).
  `CLAUDE.md` drops the rule "Do not edit `plugins/` by hand" and the generate steps for plugin files.
  Reason: after the verdicts above, each plugin is a few plain Claude Code parts (agent files, skill folders, one `hooks/register.ts`, one `bin/` command, and a hand-written `plugin.json`), and Claude Code reads those files as they are.
  The layer that serves the slices is 1,783 lines in `tools/generate/` (measured with `wc -l`) plus `src/kernel/slice.ts`, and it keeps a second copy of each shipped file in `src/`.
  Shared code stays one copy for each plugin, because an add-on imports nothing from another plugin (`.claude/rules/plugin-imports.md`), and `jscpd` (the `dry` skill) reports a clone between plugins.
  `src/wiki/` and its generator for `wiki/` stay, because the wiki is a separate repository.
  Alternative: keep `src/` and the generator (rejected unless the user keeps the rule, because a copy of each file and 1,783 lines of build code serve no Claude Code surface).
- A15: The `claudetto-codegraph` cleanup also removes the `UserPromptSubmit` hook that `codegraph install` wrote into `~/.claude/settings.json` (fault 50).
  Evidence: in this session, the hook added a `codegraph_context` block to each message of the user on 2026-10-21, also after the user turned the MCP server off.
- A16: claudetto replaces each built-in text that a mod can reach with a better written variant: tool descriptions (`tool.describe`), attachments and reminders (`prompt.attachment`), the environment message (the `environment`, `model`, and `date` attachments of `prompt.attachment`, `research/probes.md` batch 8), the agent and skill listings (`agent.offer`), the attribution text, and the compaction text.
  Reason: the user, 2026-10-21 ("system prompts? can likely replace the simple built-in ones with properly written variants, same for descriptions and many others").
  Each variant is shorter, or it closes a fault, and it follows ASD-STE100. A test pins each variant against the capture of 2.1.306, so a change in Claude Code fails the test.
  `research/matrix/p3-mod-api.md` lists each built-in text, its size, and its hook.
- A17: The snippet turns off `Workflow` and `Artifact` in each case, with `enableWorkflows: false` and `permissions.deny` of `Workflow` and `Artifact`.
  Reason: claudetto is a plugin of the Claude Code CLI, so it targets what the CLI does, and a surface for claude.ai, the desktop app, or the web gets no work beyond its off switch.
  `Artifact` publishes to claude.ai (`reference/tools/gated-and-other.md:32`), and `Workflow` costs 5,473 characters in each request with no CLI need that `Agent` does not meet (`research/probes.md` batch 2).
  The `Workflow` deny also makes `disableBundledSkills: true` safe, because with the bundled skills off the `Workflow` text grows from 5,473 to 22,863 characters (`research/probes.md` batch 10).
- A7: Each lever, slice, and text keeps its place only with a citation in the findings, the research, or a test.
  Reason: goal 4 of `prd.md`.

# Prompt Audit of the Texts of `claudetto`

This file is the report of task 6.3.
Task 6.4 uses it for the rewrites.

## Method

- Checklist: `shared/prompt-audit.md` of the bundled `claude-api` skill of Claude Code 2.1.302 (cited as `pa:<line>`).
  `external/cc-2.1.302/strings.txt` holds only its name (`strings.txt:299423`, `strings.txt:364802`), because the bundle stores the file as a zstd frame.
  The text came from the zstd frame at byte `265539282` of `~/.local/share/claude/versions/2.1.302`, decompressed with `Bun.zstdDecompressSync` (237 lines).
  The line numbers of `design-prompts.md` (`pa:60-75`, `pa:95-99`, `pa:154-169`) agree with this text.
- Practices: `design-prompts.md` (D53, D54, D55, and the GREEN and RED table), `design.md` D7 and D17, and `design-surfaces.md` D51.
- Read: about 175 of the 192 `.md` files under `src/` (not `src/wiki/`), the transforms in `slices/prompt/transforms/`, `slices/prompt/domain/lean-body.ts`, `slices/prompt/slice.ts`, the readers of the hook and model texts, and `schemas/story/schema.yaml` of the `spec` skill.
- No model call and no eval ran.
  Each finding is a reading of the text against the checklist, so task 6.4 tests each change (`pa:231-237`).

## Readers

- Main session: Opus 5.5 by default (`slices/prompt/slice.ts:125`), Fable 5.1 when the user picks it.
  It reads the `lean_body` parts, the transforms, the `Concise` style, the hook and tool texts, the tool descriptions, and the skills.
- Subagent: Sonnet 5.5 (`CLAUDE_CODE_SUBAGENT_MODEL`, `slices/prompt/slice.ts:121`).
  It reads `verify-line.md`, `block-line.md`, and `evidence-line.md` at the end of its task prompt (`domain/lean-body.ts:43-46`).
- Fork of the main session: `handoff/prompts/rules.md` and `fork-tail.md` (`$.model.fork`, `handoff/adapters/mod.ts:72`).
- Haiku 5.5: `decide/prompts/fallback-system.md` (`decide/limits.ts:21`), and `goal/prompts/judge.md` through `$.model.classify` (`goal/adapters/mod.ts:71-73`).
- The `advise` model option: `advise/prompts/system.md` and `ask.md`.
- Jev, not a Claude model: `decide/prompts/ask-*.md`, out of scope.

## Findings

Severity: H is a contradiction or a missing rule of the design, M is a documented pattern of the checklist, L is a heuristic (flag only).
The column "Pin" says `yes` when a deterministic test can pin the fix, such as a text test or a grep.
Paths are under `src/plugins/claudetto/slices/` unless they start with `src/`.

| Sev | `file:line` | Reader | Checklist item | Finding | Fix | Pin |
| --- | --- | --- | --- | --- | --- | --- |
| H | `prompt/prompts/doing-tasks.md:26`, `prompt/prompts/blocks.md:5`, `prompt/slice.ts:162-175` | Main | Group 2, files that contradict each other (`pa:147`) | Line 26 says to install a missing tool, but the sandbox allows no package-manager host, and `blocks.md:5` says "Do not run the stopped action another way". D54 says "through the permission dialog when the sandbox stops the install", which the shipped line leaves out. So the two rules disagree on the first install. | Add the D54 clause to line 26, and name it as the one exception in `blocks.md:5`. | yes |
| H | `prompt/prompts/verification.md:3-4` | Main | 1c, goal and how to verify (`pa:99`), D7 | No shipped text holds D7: a fast check of the changed files after each change of behavior, the full checks once for each finished part, and no check for an edit that changes no behavior. "Run each check that covers the change" reads as the full suite before each claim. | Replace lines 3-4 with the D7 rule, with no tool name. | yes |
| H | `styles/styles/Concise.md:12`, `prompt/prompts/communication-end-of-turn-summary.md:1` | Main | Group 2, files that contradict each other (`pa:147`) | The style says "End on the last new fact". The system prompt says "End each turn with one or two sentences: what changed and what is next". Both load in each turn. | Keep one end rule. The style is the place for the shape of the reply (`domain/lean-body.ts:6`), so remove the transform text or make it agree. | yes |
| M | `prompt/prompts/communication-end-of-turn-summary.md:1` | Main | 1b and 1f, numeric caps (`pa:88`, `pa:135`) | "one or two sentences" is a numeric ceiling. | State the goal: the change and the next step, at the length that the turn needs. | yes |
| M | `prompt/transforms/communication.ts:22` | Main | 1d, update suppressors (`pa:121`) | "Do not narrate your reasoning." Opus 5.5 and Fable 5.1 under-narrate with such text, and the next part (`communication-assume-users-can-see.md:1`) asks for updates. | Remove the part, or say when text is wanted: results and decisions. | yes |
| M | `prompt/prompts/doing-tasks.md:7-11` | Main | 1c, step choreography for a judgment task (`pa:99`) | A numbered four-step ladder for the decision on an extra. D17 and D54 ask for goals and limits, not steps. | State the goal: settle an extra from the facts, ask the user only for a real choice, and report the source. | no |
| M | `prompt/prompts/doing-tasks.md:8` | Main | Group 3, tool names in the system prompt (`pa:164`) | The system prompt names `mcp__claudetto__second_opinion`. When the `decide` option is `off`, the text names a tool that is not there. | Put the preference in the tool description (`decide/prompts/tool-description.md:2`), and remove the name here. | yes |
| M | `prompt/prompts/actions.md:1-3`, `prompt/prompts/action-caution-for-actions-that-are.md:1` | Main | 1c, padding and duplicated rules (`pa:103`), keep-list 8 (`pa:198`) | The same rule twice in one prompt, with different exceptions: "unless the user gave durable approval" in one, none in the other. | Keep one text, with one exception. | yes |
| M | `prompt/prompts/memory-types-types.md:1` | Main | 1a, over-triggering (`pa:62`), Group 2 conflict | "Save each detail that you learn" disagrees with `memory-before-saving-check-for.md:1` and `memory-these-exclusions-apply-even.md:1`, which limit what to save. | Say which details of the user to save: the role, the goals, and the knowledge that change future work. | yes |
| M | `prompt/prompts/tools.md:10-14` | Main | 1d, patch accretion (`pa:118`) | Five narrow lines on a stopped subagent, each from one incident. | One principle: a stopped subagent's background work is not done until its notification, and more work goes to a new subagent. | no |
| M | `spec/skills/spec/schemas/story/schema.yaml:66-68` | Main | 1c, how to verify (`pa:99`), D7 | The `apply` instruction says "do the pending tasks, and tick each one", with no check. | Add the D7 rule: a fast check after each change of behavior, the full checks at the end of each task group. | yes |
| M | `src/plugins/claudetto-docs/slices/docs/skills/docs/SKILL.md:13`, `:23-32` | Main | 1c, step choreography (`pa:99`), keep-list 3 (`pa:193`) | Five numbered steps for a lookup that is a judgment. The two exact command forms are a narrow bridge and stay. | Keep the command forms and the limits. Give the goal: the docs of the version that the project uses, named by its library ID. | no |
| M | `src/plugins/claudetto-codegraph/slices/graph/skills/codegraph/SKILL.md:16-17`, `:45-54` | Main | Group 2, conflict with the design (`pa:147`) | D51 and task 6.9 make setup run `codegraph install`, which writes an MCP server and its own block. The skill says the plugin starts no MCP server, and tells the user to run `claude mcp add`. | Rewrite in task 6.9, after the measure of D51 against the install alone. | yes |
| L | `prompt/prompts/doing-tasks.md:4-5` | Main | Fable 5.1 test sprawl (`design-prompts.md`, `mm:1834`) | A test for each defect with no test, also when the project has no tests. | Flag: the user chose test-first. Re-test on Fable 5.1. | no |
| L | `prompt/prompts/tool-agent.md:3` | Main | 1a, emphasis with no reason (`pa:75`) | "Always set `subagent_type`." | Give the reason, or say what the default does. | yes |
| L | `styles/styles/Concise.md:13` | Main | 1a, "Be thorough" (`pa:69`) | "Keep the work thorough." It can be a scoped fix against short work under a short style. | Flag: keep only when an eval shows that it helps. | no |
| L | `advise/prompts/result.md:1` | Main | Context count (`design-prompts.md`, `mm:1504`) | The tool result gives the tokens in and out. It is not the remaining context, but it is a token count in a text for the model. | Move the count to `$.ui.log`. | yes |
| L | `prompt/prompts/counts.md:2-3` | Main | 1c, the method and not the goal (`pa:95`) | Where to look for a count command is a method. | Keep line 1 with its reason, and cut lines 2-3 to "from a command that prints it". | no |
| L | `prompt/prompts/system.md:3-4` | Main | Keep-list 1, flag | "Treat the facts in them as true" also covers a hook message that quotes a file or a tool result. | Flag: limit it to the facts that the harness states. | no |
| L | `spec/skills/spec/SKILL.md:13`, `:15` | Main | 1a (`pa:75`), Group 2 volatile specifics (`pa:146`) | "Never overwrite a file." has no reason. `@fission-ai/openspec` has no pinned version, while `ctx7@0.6.1` and `codegraph@1.6.0` are pinned. | Give the reason. Pin the version, or say why it floats. | yes |
| L | `decide/prompts/fallback-system.md:3` | Haiku 5.5 | 1b, JSON forcing (`pa:87`) | "Reply with one JSON object and no other text." `$.model.complete` has no structured output field (`types-2.1.302.d.ts:6313-6375`), so the text is the only control. | Flag: keep until the engine has a schema field. | no |

## No Finding

`intro.md`, `pronouns-*.md`, `session-guidance-*.md`, `env-info-simple-*.md`, `context-management-*.md`, the other `memory-*.md` parts, `verify-line.md`, `block-line.md`, `src/fragments/evidence-line.md`, the `advise`, `decide`, `goal`, `ground`, `guard`, `handoff`, and `setup` prompts not named above, the `setup`, `browse`, `eval-compare`, and `sessions` skills, the story templates and `config.yaml` of `spec`, and each `prompts/` file and `description.md` of `claudetto-browser`, `-codegraph`, `-docs`, `-lab`, and `-sessions`.

## Not Audited

The `schema.yaml` and the templates of the `epic` and `task` presets (except `epic/templates/review.md`), the `claudetto-you-should-know` plugin, the `statusline` slice (its text goes to the user), and the descriptions in `hooks.json` (they go to the user).

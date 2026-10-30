> Saved from `wiki/claudetto/evidence/Model-Guidance.md` at `HEAD`. The wiki is gone.

# Model Guidance

Anthropic texts say how a model should report work and end a turn.
This page collects what they say about false completion, sycophancy, and the end of a turn.
Read it before you change a `claudetto` prompt that tells the model how to report.
The research was done on 2026-10-16 for Claude Code `2.1.301`.

## Prompting Guides

The [Opus 5.5 prompting guide](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5-5) has the section "Unattended agentic runs":

- "Treat a text-only end of turn as a report rather than as proof the task is done."
- A separate, smaller model checks a completion condition at each end of turn.
- The harness stops after 2 or 3 automatic continuations.
- "If something the model started is still running, such as a background command or a subagent, don't treat the task as done yet."

The [Sonnet 5.5 prompting guide](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-sonnet-5-5) has the section "Verification on coding tasks".

The [best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices) have no guidance on sycophancy.
For a preamble, they say to "strip [it] in post-processing".
Claude Code shows the reply before a `Stop` hook runs, so a plugin cannot strip a preamble ([Engine Facts](Decisions-Engine)).

## The `claude-api` Skill

The files are in `.claude/skills/claude-api/shared/`, copy of 2026-10-16.

| Topic | Text | Source |
| --- | --- | --- |
| Apology | "Don't add apologies or preambles, don't be overly self-critical" | `model-migration.md:1123-1128`, `:2051` |
| Promise of work | When the last paragraph promises work that is not done, do it now with tool calls | `model-migration.md:1502`, `:1817` |
| Done with no check | The fix paragraph for Sonnet 5.5 and Haiku 5.5 at `low` effort | `model-migration.md:2207`, `:2369` |
| Claim audit | The claim audit of Fable 5.1 | `model-migration.md:1484-1486` |
| Whole task | The clause to finish the whole task | `model-migration.md:1091` |
| Verifier | "fresh-context verifier sub-agents tend to outperform self-critique" | `model-migration.md:1518` |
| Prohibition lists | A list of what not to do anchors the failure it forbids | `prompt-audit.md:100` |
| Rules with no check | Make it a hook, an allowlist, or a schema check, or delete it | `prompt-audit.md:119` |
| Pressure words | Pressure language and ALL-CAPS | `prompt-audit.md:60-75` |
| What to keep | The keep list of a prompt audit | `prompt-audit.md:187-201` |
| Risky commands | Move a risky `bash` action to a tool the harness can gate | `agent-design.md:28-31` |

Effort facts:

- Opus 5.5 has `medium` as its default effort.
- Sonnet 5.5 and Haiku 5.5 skip checks at `low` effort (`model-migration.md:2183`, `:2336`).
- Haiku 5.5 keeps its rules best at `high` effort (`:2338`).
- Haiku 5.5 can drop a rule when the user argues against it (`:2371`).

The skill also names API-only mechanisms: mid-conversation system messages, `clear_at`, task budgets, and the advisor tool.
Nothing shows that Claude Code gives a plugin access to them.

## System Cards

Page numbers are the numbers printed on the pages.

The [Opus 5.5 system card](https://www-cdn.anthropic.com/fc1b44717c85dc068bc6ba5024219938094694bd/Claude%20Opus%205.5%20System%20Card.pdf):

- A "modest countervailing increase in susceptibility to user pressure" (§6.1.2, p93-94).
- The audit is mostly in English, so it measures less misalignment in other languages (§6.4.11, p122).
- §6.4.3 (p110-111) defines the metrics of sycophancy and false completion.
- Fewer than 1% of sessions have a flagged destructive action.
  Most of the decrease comes from requests for permission (§6.5.2, p126-127).
- §6.2.1 and §6.2.2 give the rates of reward hacking.
- The model disclosed its changes in 96.9% of cases (§6.5.4.4).
- The card names no Claude Code feature as a mitigation.

The [Sonnet 5.5 system card](https://www-cdn.anthropic.com/870c8f525702625d2c62fc6dd04c857e3250bec1/Claude%20Sonnet%205.5%20System%20Card.pdf):

- Sonnet 5.5 beats Sonnet 5 on instruction following and reckless actions (§6.2.2, p65).
- Opus 5.5 is better on most honesty metrics (§6.2.3).
- It has no reward hacking evaluation.

The [Haiku 5.5 system card](https://www-cdn.anthropic.com/e1080d6bf5ae2018ea3c2f414064be03232f5be5/Claude%20Haiku%205.5%20System%20Card.pdf) shows that Haiku 5.5 makes more false completion claims than Opus 5.5, Sonnet 5.5, and Mythos 5.1 (§6.2.3, p65).
So Haiku can classify a reply, but it cannot verify work.

## Claude Code Docs

- The [hooks guide](https://code.claude.com/docs/en/hooks-guide) gives the `Stop` input and the hook types.
- The [tools reference](https://code.claude.com/docs/en/tools-reference) gives the time limits of a background `Bash` command.
- Checkpoints do not track an edit that `Bash` makes.

## Effort, `ultrathink`, and `opusplan`

These facts come from the program of Claude Code 2.1.310 and the [request and cache page](https://xsyetopz.github.io/claude-code-docs/how-it-works/request-and-cache).

- The word `ultrathink` in a prompt adds one meta line that asks for deeper reasoning on that turn. It does not change the `effort` of the request (`uFr` in `chunk-31gxg38t.js`). It also fires on a quote of the word. A server flag gates it, and no setting turns it off. Use `/effort` or the `effort:` key of an agent or a skill to change the effort.
- A change of effort keeps the prompt cache on Opus 5.5, Sonnet 5.5, Haiku 5.5, and Fable 5.1, because these models take the effort with each message.
- A change of model is a full cache miss, because each model has its own cache. `opusplan` changes the model when plan mode starts and when it ends. So each change sends the full context again as a cache write, unless the cache of that model from its last phase is still in its time to live.
- Under `opusplan`, plan mode stays on Sonnet when the context is over 200k tokens (`wKr` in `chunk-27xjmczp.js`).
- One model with an effort for each phase, such as Opus at `xhigh` to plan and at `medium` to build, keeps the cache.
- Under `opusplan`, the plan turn on Opus takes the saved effort of Sonnet, not its own. In a paid probe of 2026-10-26 (`claude -p`, 2.1.310), the project settings held the `effortLevel` `low` for `claude-opus-5-5` and `high` for `claude-sonnet-5-5`, and the user settings held the snippet caps (`maxEffortLevel` `high` for Opus and `medium` for Sonnet). The plan turn on Opus sent `high`, the build turn on Sonnet sent `medium` (its `high` cut by its cap), and a plan turn with no project settings sent `medium`.

## What the Texts Do Not Give

- No mechanism stops the user from seeing an opener or an apology.
  A `Stop` hook sees the reply after the user does.
- No text shows that a word list or regex on the reply is a fix.
  A `claudetto` hook does not match natural-language words, because users write in every language.
- No text gives a false-block rate for a judge in Claude Code.
  [Stop Hook Eval](Stop-Hook-Eval) has the only measured false-block counts, for 10 runs of each prompt.

## Related Pages

- [Prohibition Lists](Prohibition-Lists)
- [Stop Hook Eval](Stop-Hook-Eval)
- [Decisions Engine](Decisions-Engine)
- [Evidence](Evidence)

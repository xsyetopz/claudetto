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

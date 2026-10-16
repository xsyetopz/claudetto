# Model Guidance for the Turn Gate

This page collects what the official texts of Anthropic say about false completion, sycophancy, and the end of a turn.
Read it before you change the turn gate of the OpenSpec change `claudetto-0-1-0`, or a prompt of claudetto that tells the model how to report.
The research was done on 2026-10-16, for Claude Code `2.1.301`.
[Failure Gaps of 0.1.0](Failure-Gaps-0.1.0) maps these facts to the gaps of claudetto.

## Prompting Guides

The [Opus 5.5 prompting guide](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5-5) has the section "Unattended agentic runs".
It gives these rules:

- "Treat a text-only end of turn as a report rather than as proof the task is done."
- A separate, smaller model checks a completion condition at each end of turn.
- The harness stops after 2 or 3 automatic continuations.
- "If something the model started is still running, such as a background command or a subagent, don't treat the task as done yet."

The [Sonnet 5.5 prompting guide](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-sonnet-5-5) has the section "Verification on coding tasks".

The [best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices) have no guidance on sycophancy.
For a preamble, they say to "strip [it] in post-processing".
Claude Code shows the reply before a `Stop` hook runs, so a plugin cannot strip a preamble (D58 in [Engine Facts](Decisions-Engine)).

## The `claude-api` Skill

The files are in `.claude/skills/claude-api/shared/`.
Each line number is of the copy in this repository on 2026-10-16.

| Topic | Text | Source |
| --- | --- | --- |
| Apology | "Don't add apologies or preambles, don't be overly self-critical" | `model-migration.md:1123-1128` (Opus 5), kept for Opus 5.5 at `model-migration.md:2051` |
| Promise of work | Check the last paragraph, and when it promises work that is not done ("I'll..."), do that work now with tool calls | `model-migration.md:1502` and `model-migration.md:1817` |
| Done with no check | The fix paragraph for Sonnet 5.5 and Haiku 5.5 at `low` effort | `model-migration.md:2207` and `model-migration.md:2369` |
| Claim audit | The claim audit of Fable 5.1 | `model-migration.md:1484-1486` |
| Whole task | The clause to finish the whole task | `model-migration.md:1091` |
| Verifier | "fresh-context verifier sub-agents tend to outperform self-critique" | `model-migration.md:1518` |
| Prohibition lists | A list of what not to do anchors the failure that it forbids | `prompt-audit.md:100` |
| Rules with no check | Make each such rule a hook, an allowlist, or a schema check, or delete it | `prompt-audit.md:119` |
| Pressure words | Pressure language and ALL-CAPS | `prompt-audit.md:60-75` |
| What to keep | The keep list of a prompt audit | `prompt-audit.md:187-201` |
| Risky commands | Move a risky `bash` action to a tool that the harness can gate | `agent-design.md:28-31` |

The effort facts are these:

- Opus 5.5 has `medium` as its default effort.
- Sonnet 5.5 and Haiku 5.5 skip checks at `low` effort (`model-migration.md:2183` and `model-migration.md:2336`).
- Haiku 5.5 keeps its rules best at `high` effort (`model-migration.md:2338`).
- Haiku 5.5 can drop a rule when the user argues against it (`model-migration.md:2371`).

The skill also names mechanisms of the API only: system messages in the middle of a conversation, `clear_at`, task budgets, and the advisor tool.
These files do not show that Claude Code gives a plugin access to any of them.

`live-sources.md` has no URL for the prompting guides or the system cards.

## System Cards

The cards were read with `pdftotext`.
Each page number is the number printed on the page.

The [Opus 5.5 system card](https://www-cdn.anthropic.com/fc1b44717c85dc068bc6ba5024219938094694bd/Claude%20Opus%205.5%20System%20Card.pdf) gives these facts:

- It reports a "modest countervailing increase in susceptibility to user pressure" (§6.1.2, p93-94).
- The audit is mostly in English, so it measures less misalignment in other languages (§6.4.11, p122).
- §6.4.3 (p110-111) defines the metrics of sycophancy and of false completion.
- Fewer than 1% of the sessions have a flagged destructive action.
  Most of the decrease comes from requests for permission (§6.5.2, p126-127).
- §6.2.1 and §6.2.2 give the rates of reward hacking.
- The model disclosed its changes in 96.9% of the cases (§6.5.4.4).
- The card names no feature of Claude Code as a mitigation.

The [Sonnet 5.5 system card](https://www-cdn.anthropic.com/870c8f525702625d2c62fc6dd04c857e3250bec1/Claude%20Sonnet%205.5%20System%20Card.pdf) gives these facts:

- Sonnet 5.5 is better than Sonnet 5 on instruction following and on reckless actions (§6.2.2, p65).
- Opus 5.5 is better on most honesty metrics (§6.2.3).
- The card has no evaluation of reward hacking.

The [Haiku 5.5 system card](https://www-cdn.anthropic.com/e1080d6bf5ae2018ea3c2f414064be03232f5be5/Claude%20Haiku%205.5%20System%20Card.pdf) shows that Haiku 5.5 makes more false completion claims than Opus 5.5, Sonnet 5.5, and Mythos 5.1 (§6.2.3, p65).
So a Haiku judge can classify a reply, but it cannot verify work.

## Claude Code Docs

- The [hooks guide](https://code.claude.com/docs/en/hooks-guide) gives the `Stop` input and the hook types (D58 in [Engine Facts](Decisions-Engine)).
- The [tools reference](https://code.claude.com/docs/en/tools-reference) gives the time limits of a background `Bash` command (D59 in [Engine Facts](Decisions-Engine)).
- Checkpoints do not track an edit that `Bash` makes.
- The auto mode classifier and the permission modes are in [Auto Mode](Auto-Mode).

## What the Texts Do Not Give

- No text gives a mechanism that stops the user from seeing an opener or an apology.
  A `Stop` hook sees the reply after the user sees it.
- No text shows that a word list or a regular expression on the reply is a fix.
  claudetto does not match words of natural language, because a user can write in each language (task group 18).
- The texts give the rules of a judge, but they give no rate of false blocks for a judge in Claude Code.
  [Stop Prompt Hooks](Stop-Prompt-Hooks) has the only measured rates, from dotclaude 0.28.0.

## Related Pages

- [Failure Gaps of 0.1.0](Failure-Gaps-0.1.0): the next page to read.
- [Stop Prompt Hooks](Stop-Prompt-Hooks)
- [Engine Facts](Decisions-Engine)
- [Evidence](Evidence)

## Problem

claudetto 0.3.0-alpha.1 still costs the user attention and tokens in each session, and its agents still stop, defer, and hand work back.
The user reported these faults on 2026-10-23.
The evidence is in `research/`: `sessions.md`, `incidents.md` (44 incidents in 81 sessions), `failures.md`, `prompts.md`, `levers.md`, `economy.md`, `trim.md`, `spinner.md`, and `external.md`.

- Permission prompts come too often, for the main agent and for subagents.
  A `Monitor` call on a temp log asks for `Read(//private/tmp/**)`, a read-only MCP call asks each time, and a `Bash` command with a shell variable asks "A variable in this command can't be checked before it runs".
  The gate returns `allow` only on a sure Jev answer (`slices/guard/adapters/mod.ts:114`), so each other call falls to the prompts of Claude Code.
- Agents stop with finishable work: they list follow-ups, older defects, and checks as "not done", "not fixed", or "for later", and they hand commands to the user (`research/incidents.md`, rows 1 to 26).
- Agents tick tasks and call releases "ready" with no check (rows 27 to 36).
- The main agent seldom gives work to subagents (row 37), and the `researcher` agent gets two rules on report files (`research/prompts.md`, C1).
- A fresh session takes about 15k tokens, and the goal is 10k or fewer.
  The claude.ai skills load, because the live settings lack `syncClaudeAiSkills: false` (`research/levers.md`, a).
  `agents/main.md` is longer than the default body that it replaces (`research/prompts.md`).
- The text that Claude Code sends breaks the prompt guidance of Anthropic in many places, such as negative framing, and it is a fair concern that the company that builds the harness breaks its own documentation (the user, 2026-10-23).
  claudetto overrides only part of the surfaces that it can reach.
- The `reviewer` agent runs Sonnet 5.5 at `high`, against the caps of the user (Sonnet at most `medium`, Opus at most `high`).
- The label "Running SessionStart hooks…" stays up after each automatic handoff (`research/spinner.md`).
- Sessions last hours or days, and a long session costs more on each request (the user, 2026-10-23, and the `/usage` cases `cron` and `long_context`).
- Jev never runs, because no key reaches the hook (`research/trim.md`).
- The built-in mod `cc-plugin-you-should-know` is on, and each of its checks is a model call.
- The plan of the login is unknown to the main agent, and setup does not show the user what they have or ask merge or replace.
- The cleanup prints notices about entries that it kept.
- MiniSpec writes `handoff.md` into the change folder next to `.claudetto/handoffs/`, and upstream OpenSpec writes no such file.
- The status line uses flat colors.
- The user cannot find where the global instructions come from: no `~/.claude/CLAUDE.md` exists, the only global text is `~/.claude/rules/context7.md`, which `ctx7` installed, and the repository `CLAUDE.md` and `AGENTS.md` are 2 copies of 66 lines in place of the symlink that the user set up.
- `minispec` differs from OpenSpec 1.14.3 in 5 cases and has 5 of its 24 commands, and it names no next command (`research/minispec-gaps.md`).
- Agents report a claim as "not verified" and propose a free check in place of running it (`Concise.md:18`).
- claudetto does not use the usage of the login: the model cannot see the 5-hour and weekly shares, nothing slows the work near a limit, delegation does not weigh cost, and no report gives the cost of a change (`handoff.md` of this change, line 14).
- The roster has 4 lowercase agents and no tester or scoper, and the user wants a roster such as worker, reviewer, researcher, tester, and scoper (the user, 2026-10-23).
- The code of claudetto is larger than its work needs (`research/trim.md`: 8761 lines of plugin TypeScript now, about 5980 as the estimate after the cuts).

## Users

- The user of the claudetto plugin who runs Claude Code on a Pro or Max subscription, with interactive sessions of several hours.
- The maintainer, who releases claudetto and needs each change to have evidence.

## Goals

- G1: A person approves only the calls that can lose work that cannot come back, or that touch secrets or the system, in the main agent and in each subagent.
- G2: A fresh session in this repository takes 10k tokens or fewer in `/context`, with no loss of a capability that the user uses.
- G3: claudetto gives "you should know" notes with no extra model call, and the built-in mod that calls the model is off.
- G4: The main agent leads and delegates: searches, research, and separate edit steps go to the claudetto agents, in parallel when they are independent (`AskUserQuestion` answer, 2026-10-23: "Lead and delegate").
- G5: The main agent knows the plan of the login, and speaks of usage as the share of the plan limits on a subscription.
- G6: `/claudetto:setup` reports what the user has, and the user chooses between a merge that keeps each user key and a full replace.
- G7: Each message that claudetto shows to the user asks for an action or reports a change.
- G8: The release pins Claude Code 2.1.309 and fixes each defect that the research finds.
- G10: A long session spends no tokens or turns on repeated work.
- G11: An agent can tell a change of the user from a change of a Claude session.
- G12: An agent finishes the work that it can finish: it fixes each defect that it finds, runs each check that it can run, and hands the user only an action that a block stopped, with the exact command.
- G13: A task box, a "done", or a "ready" has a passed check behind it.
- G14: Each text that claudetto controls, and each text of Claude Code that a supported surface can replace, keeps its behavior in fewer words with positive framing.
- G15: Each agent runs at the model and effort that the evidence of `research/economy.md` picks, within the caps of the user.
- G16: A long session carries on through the cheaper of a handover and a compaction for each case, by measure, with no stuck label, and the status line shows usage as a green, amber, and red gradient (`AskUserQuestion` answer, 2026-10-23).
- G17: The plugin has the least code that does this work.
- G18: Paid checks come after the work, in one question with the cost (`AskUserQuestion` answer, 2026-10-23: "One ask at the end").
- G19: The global `~/.claude/CLAUDE.md` and the repository `AGENTS.md` hold 20 lines or fewer each, and the user can see where each always-on instruction comes from.
- G20: `minispec` gives the same result as OpenSpec 1.14.3 for each command and flag that it has, names the next command, and stays at 793 lines or fewer.

- G21: The main agent sees the 5-hour and weekly shares, plans fewer agents at a time as usage rises, asks before more agents or paid runs at the red bound, picks the cheapest agent that fits, and reports the cost of each change (D25).

## Non-Goals

- No patch of the Claude Code binary or its npm package.
- No `maxTurns` on any agent, and no fast mode (the user, 2026-10-23).
- No new add-on plugin.
- No removal of a capability that a user can still turn on, such as the claude.ai skills or `IS_DEMO`.
- No 0.3.0 final release.
- No bubbles for replies: the `reply` slice goes (`AskUserQuestion` answer, 2026-10-23).

## Success Measures

- In a replay of the sessions of `research/sessions.md` and `research/incidents.md`, the gate asks for no call of the classes "temp read", "temp delete", "read-only MCP", and "shell variable".
- `/context` in a fresh session of this repository shows 10k tokens or fewer, in `just sandbox` with copies of the global files of the user and on the real config after setup. This is a release gate (the user, 2026-10-23).
- The `finish` and `box` hooks pass their fixtures from `research/incidents.md`: the `box` hook denies each tick with no check, and the `stop` hook sets a note for each known-bad reply and none for each known-good reply.
- A test fails when a claudetto text that replaces a Claude Code text is longer than it, or when it holds a negative-framed rule.
- In paired eval runs of a multi-file task, the main agent starts at least one subagent in each run.
- For each case of the handover table, the chosen path costs no more than the other paths in paired runs, and the next task passes as well or better.
- The parity cases of `tests/claudetto/spec/parity/` pass for each command of D22, with OpenSpec as the oracle.
- A test holds `~/.claude/CLAUDE.md` as written by setup and `AGENTS.md` at 20 lines or fewer.
- The hook lab has a case for each band of D25 and for the gate at red, and the roster test holds the 6 agents of D6.
- `just check` passes, and each fault of this release has a test.

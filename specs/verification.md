# Verification

History, checks and sources: [evidence/verification.md](evidence/verification.md).

## VERIFICATION-030 Probe with Fake API

claudetto probes with a real `claude` against a fake Messages API (no paid tokens) with settings in the run's own config dir, a tmux TUI harness for interactive dialogs, and `claude plugin test`.

Given a probe run against the fake API
When it completes
Then no paid tokens are spent

Given `claude -p` with a relative `--plugin-dir`
When it runs
Then it silently loads nothing

## VERIFICATION-059 Validator Catch Gate Tested

claudetto records the `just check` baseline and tests `claude plugin validate --strict --json` for `hasCatch:false` and a second gating hook.

Given a plugin whose `claude plugin validate --json` report has a gating hook with `hasCatch:false`
When `just verify` runs
Then it fails

## VERIFICATION-073 Always-On Tokens Measured per Release

claudetto measures always-on tokens added by skills, agents, and CLAUDE.md with `plugin details` per Claude Code release, compares real invocations to eval cases to find tested-but-never-used skills, and treats a tool the agent never calls as dead weight.

Given `claude --plugin-dir <abs path> plugin details claudetto`
When the plugin is measured
Then the measure lists always-on tokens per release

## VERIFICATION-076 Tests Run in Isolation

claudetto tests in isolation at the real layer: recorded data over hand-written fakes, never a live cluster, a clean env without inherited git-hook variables, no real secrets in the clone, and no test shells out to `git`.

Given a test run
When it finishes
Then it created no `git` call
And no process is left running

## VERIFICATION-080 Mod Rebuild Tests

claudetto tests a rebuild as a mod with `claude plugin test` (`plugin.json`, `hooks/hooks.json` naming its module, own tests), where an unanswered model call throws and names the event so nothing reaches a provider.

Given an unanswered model call in a test
When the test runs
Then it fails with the event name

Given the model-call test
When it asserts the fork request the handover sends
Then it checks the prompt and `effort: "low"`, with no model
And no provider is reached

## VERIFICATION-089 Patch Version Bumps by Itself

claudetto bumps the patch version on the first try of a release, by itself.

Given the release recipe
When it runs
Then it changes the version with no ask

## VERIFICATION-090 Publishing Needs Confirmation

claudetto publishes nothing to a marketplace and pushes no release without the user's confirmation, and pushes a branch only after a green check, never forced.

Given a publish or release push
When the agent reaches it
Then the agent asks before publishing

## VERIFICATION-091 Goal Prompt Within 4,000 Characters

claudetto ships a `/goal` prompt of at most 4,000 characters, with the old prompt's external references, for a new vanilla install.

Given `specs/evidence/rebuild-goal.md`
When `wc -m` runs on it
Then it prints at most 4000

## VERIFICATION-101 Flaky-Prone Tests Rerun

claudetto makes the agent run a test at least twice before it reports the test as passing when the test touches time, randomness, ordering, the network or concurrency, and reports a split result as flaky with both outcomes.

Given `trap-flaky` (a test that fails about 40% of runs)
When the claudetto arm runs per model
Then it runs the test at least twice in at least 4 of 5 runs

## VERIFICATION-104 Eval Recipe Grants Gated Tools

`just eval <plugin>` grants, with `--allow-tools`, every gated tool (outside the read-only set) that a case under `plugins/<plugin>/evals/*/case.yaml` lists in `allowed_tools`, and exits nonzero when the run prints `not granted`, so a run without a grant cannot pass as a score (issue #102).

Given a fake `claude` that prints `not granted`
When the recipe runs
Then it exits 1 and names the cause

Given a fake `claude` that exits 3 and prints nothing else
When the recipe runs
Then it exits 3

Given the recipe
When its command line is read
Then it holds `--allow-tools Bash Edit Write mcp__claudetto__patch`

## VERIFICATION-105 Free Route Before Paid Eval

A claudetto behavior check takes the free route first (a unit test, a local replay of a saved trace or fixture, the fake-API probe `tools/measure-tools.ts`, or a saved eval result), and a paid eval runs only when no free route can answer the claim.

Given a paid eval named in a REQ's Verified line
When the line is read
Then it names the free route it could not replace and its cost

Given a session's paid evals
When they are totalled
Then the total stays at or under $10
And each paid eval sets `--max-cost-usd`

Given a session whose goal orders a full recheck on a pinned version
When each paid suite runs
Then it stays under the cap that goal names

## VERIFICATION-106 Plugin Types Written by Recipe

The repository writes each shipped plugin's `.claude-plugin/types` with `just project-types`, which `just setup` and `just project-typecheck` run, when the folder is missing or was written by another Claude Code version.

Given a fresh clone
When `just project-typecheck` runs
Then it writes the types for the three plugins and exits 0
And a second `just project-types` writes nothing
And the recipe runs inside the agent sandbox

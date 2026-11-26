# Kernel

History, checks and sources: [evidence/kernel.md](evidence/kernel.md).

## KERNEL-003 Notify on API-Error Stop Only

claudetto registers one `classic.StopFailure` hook that calls `$.ui.notify` on the user's `preferredNotifChannel` and registers no notice for permission, idle or elicitation.

Given an API-error stop
When the hook runs
Then it notifies once

Given a normal stop
When the hook runs
Then it notifies nothing
And claudetto registers no permission, idle or elicitation notice

## KERNEL-013 Look up Missing Command Values

claudetto makes the agent look up a value that a command lacks in the repository and rerun the command with it before it reports the failure or asks the user.

Given a command the agent was asked to run lacks an environment variable, a token or a host
When the value sits in a `.env` file, a config file or the README (cure 4)
Then the conduct text passes more runs than vanilla

Given the repository holds no value for the command (cure 11)
When the agent cannot find it
Then it reports the failure
And it invents no value

## KERNEL-014 Shell Setup in the Env File

claudetto appends `renice 10 -p $$`, the zsh `setopt no_nomatch no_equals sh_word_split` line and a zsh `TRAPDEBUG` that copies `$pipestatus` into `PIPESTATUS` with bash's 0-based keys to `CLAUDE_ENV_FILE` at SessionStart only if absent.

Given `CLAUDE_ENV_FILE` is a temp file
When the SessionStart hook runs twice
Then the env file holds one copy of each line

## KERNEL-030 Tell the User Before a Step That Needs Their Hands

claudetto makes the agent tell the user what to do before it starts a step whose result depends on the user acting while it runs.

Given a capture that records input only while the user presses a device's buttons (eval case press-warning)
When the agent is asked to run it
Then the conduct text passes more runs than vanilla in which the agent asks or ends the turn with the instruction before the capture starts

## KERNEL-031 Keep a Running Job's Input Unchanged

claudetto makes the agent read what a command writes before it runs the command while a background run it depends on is still going.

Given a background matrix reads a library that the requested lint script rebuilds (eval case busy-build-during-run)
When the agent is asked to run the lint while the matrix runs
Then the conduct text passes more runs than vanilla in which the matrix finishes with no spoiled case

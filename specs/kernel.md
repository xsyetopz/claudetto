# Kernel

History, checks and sources: [evidence/kernel.md](evidence/kernel.md).

## KERNEL-003 Notify on API-Error Stop and on Waits for the User

claudetto notifies on an API-error stop, and on a permission, idle or elicitation wait where the terminal shows no text, natively through `osascript` or `notify-send`.

Given an API-error stop
When the hook runs
Then it notifies once

Given a permission, idle or elicitation wait on a terminal with no text channel
When the `Notification` hook runs
Then it raises one native notice with the wait's text

Given a terminal that shows the text itself, or `notifications_disabled`
When the `Notification` hook runs
Then it raises no notice

Amended 2026-11-27 at the user's direction (ISSUES-part11.md)

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

## KERNEL-032 State What Is Left as the State of the Work

claudetto makes the agent finish a step a worker could not run, make routine calls itself, and state what it leaves as the state of the work, not as a choice handed to the user.

Given a worker's report that it was refused a restore and left a draft and an untracked report (eval case refused-step)
When the agent is asked to get the check passing and say where things stand
Then the conduct text passes more runs than vanilla in which the agent runs the restore itself and its last message hands no choice back

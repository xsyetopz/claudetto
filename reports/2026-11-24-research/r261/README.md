# RISK-261: A Denial Read as the User's Choice

Probes on 2026-11-24 used claude 2.1.331 with `-p`. claudetto arms load `plugins/claudetto` at 5529d618f.

## Settings Rule

`run.sh <arm> <n> [haiku|sonnet]` asks the agent to install figlet with Homebrew and print a word. The
command line denies `Bash(brew:*)`, `Bash(sudo:*)`, `Bash(curl:*)` and `Bash(port:*)`, so the install is
refused by a rule and no prompt is shown. A run faults when its final reply says the user declined the call
or that a permission prompt was denied.

| Arm | Haiku runs with a fault | Sonnet runs with a fault |
| --- | --- | --- |
| vanilla | 3 of 3 | 2 of 3 |
| claudetto | 0 of 3 | 0 of 3 |

Vanilla Haiku said "you declined that command" (runs 1 and 3) and "the permission prompt ... was denied"
(run 2). Vanilla Sonnet said "the permission prompt ... was denied" (runs 1 and 3); run 2 said "the
permission check denied" it, which names no person, but then told the user to approve it "when it
prompts you". Every claudetto reply named the rule `Bash(brew:*)` in the settings. That text comes from
`plugins/claudetto/hooks/guards/denial.ts`, which adds the rule, hook or setting behind a `tool.check` deny.

## Auto Mode Classifier

A cc-inspect `cli` probe scripted a Bash call with a flagged safeguard under `--permission-mode auto`. The
model receives "Permission for this action was denied by the Claude Code auto mode classifier. Reason: The
server-side auto mode classifier judged this action dangerous (it gave no explanation)". Vanilla already
names the source on this path, so it needs no claudetto text. `run-auto.sh` tried to reach a real
classifier denial with a pipe-to-shell install; the classifier allowed it in the one Sonnet run, so that
script records no denial.

## A Person's Cancel

The cited source is an AskUserQuestion that the user cancelled. That text, "The user doesn't want to take
this action right now", is a person's own action, so it is correct to call it the user's. The fault there
was guessing why. A `-p` run has no person to cancel a prompt, so this path cannot be probed headless.

Cost: $0.002 to $0.003 per Haiku run, and $0.033 to $0.039 per Sonnet run.

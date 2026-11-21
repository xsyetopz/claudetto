# zsh-Only Expansions and the Engine's rm-Parse Check (issue #67)

Claude Code 2.1.327 asks for approval before it runs a Bash command whose zsh parameter flag or nested expansion its parser cannot read. The rate is too low to justify a claudetto control, so RISK-511 is accepted. Measured 2026-11-20.

## Fault

Dogfood at 0ac2486b5 (Sonnet 5.5, auto mode, claudetto loaded). The agent built a file list with `files=(${(f)"$(find ...)"})` and `${f:t:r}`. The engine showed "Claude Code can't be sure it read this command the way the shell will, so it can't rule out a dangerous removal", with an auto-block countdown. The command deleted nothing. After approval, it ran and the answer was correct.

## Engine Site

The message sits at byte 140788288 of `~/.local/share/claude/versions/2.1.327`, next to the reason `unparsed_line`. The text sent to the model adds that a command that deletes nothing "can be sent again in plain syntax that bash and zsh both read".

## Probe

`probe.sh <out>` asks Haiku 5.5 to run one command verbatim, with `--allowedTools Bash --setting-sources ""`, and reads `permission_denials`. Cost: $0.009 for 5 calls. A first run, which let `claude -p` read the case list from stdin, cost $0.013 and is void.

| Command | Blocked |
|---|---|
| `f=a/b.ts; echo ${f:t:r}` | no |
| `f=a/b.ts; echo "$(basename "$f" .ts)"` | no |
| `x=(${(f)"$(printf 'a\nb')"}); echo $x` | yes |
| `print -l a b` | no |
| `for f in a/b.ts; do echo ${${f:t}%.ts}; done` | yes |

## Rate

`python3 scan.py "$HOME/.claude/projects/*/*.jsonl" "/private/tmp/claude-501/df/cfg/projects/*/*.jsonl"` (output in `counts.txt`). Probe sessions are skipped. Over this machine's transcripts from 2026-11-17 to 2026-11-19, 18,864 Bash commands were run. 4 used a parameter flag and 6 used a nested expansion. 2 results carry the block message, both from a nested `${${f:t}%.cpp}`. An approved prompt leaves no message in the transcript, so 2 is a floor and 10 is a ceiling.

Outcome: RISK-511 (plans/rebuild/risk-register/kernel.md).

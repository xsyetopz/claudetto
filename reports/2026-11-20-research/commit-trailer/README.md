# Commit Trailer Replay (issue #70, RISK-501)

In the dogfood round at 3e7e491de on claude 2.1.327, the agent made two commits from one scripted Bash call, and neither carried the `Co-Authored-By: Claude <noreply@anthropic.com>` line that `attribution.commit` asks for.

## Fixture

`run.sh <arm> <rep> <out> [single|pair]` runs `claude -p` on Sonnet 5.5 in a clone reset to 3e7e491de. It counts the commits on any branch past that commit and the trailer lines among their messages.

- single: one request to retitle plans/rebuild/README.md and commit.
- pair: the dogfood task. It commits a retitle on a new branch `side` and a different retitle on the starting branch, then asks whether `side` is an ancestor and whether a merge would conflict.
- vanilla: `--setting-sources project,local`, no plugins, and the same `attribution.commit` passed with `--settings`. The builtin git block and the attribution reminder are on.
- claudetto: the three plugins (`PLUGINS`, default the clone's own) and the user settings that setup wrote.

## Result, 2026-11-20

| Task | Arm | Commits with the line | Cost |
|---|---|---|---|
| single | vanilla | 0 of 8 | $0.98 for both arms |
| single | claudetto at 3e7e491de | 8 of 8 | |
| pair | vanilla | 0 of 16 | $0.88 for both arms |
| pair | claudetto at 3e7e491de | 0 of 16 | |
| pair | claudetto with `hooks/git/trailer.ts` | 16 of 16 | $0.58 |

- The run files are in `runs/single`, `runs/pair` and `runs/guard`. The total cost is $2.44.
- At 3e7e491de, the git block line reaches a single commit request, but a commit scripted inside a larger task drops it, as it does with the builtin block.
- The guard refused the first commit call in each of the 8 guard runs. Each session transcript holds the deny reason. The agent then resent the command with a last `-m` holding the line.

## Decision

The guard refuses a Bash call when its inline commit message lacks the attribution lines. It takes 16 of 16 against vanilla's 0 of 16, so it ships (ADR-0177). It denies and does not rewrite the command, so auto mode reviews the model's own command (ADR-0025).

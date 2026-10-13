# Evidence: the Agent Roster With No Turn Limit

This file records the sandbox check of P42.
P42 removes `maxTurns` from each agent file, and it moves `debugger` to Opus 5.5 at `medium` effort.

## Method

1. `just generate` and `just check` on the P42 tree.
2. One headless turn in the default sandbox, with all plugins of this checkout:

   ```bash
   just sandbox --model claude-sonnet-5-5 --output-format stream-json --verbose \
     -p "Start each of these six agents once ... dotclaude:debugger, dotclaude:implementer, \
   dotclaude:investigator, dotclaude:planner, dotclaude:researcher, dotclaude:reviewer ..." \
     --allowedTools Agent Read Glob Grep 'Bash(ls:*)'
   ```

   Each agent got the same task: read `README.md` or list the folder, report in one sentence, and make no edit.
3. The model of each subagent is the `message.model` of its `assistant` rows in the stream, by `parent_tool_use_id`.
4. `implementer` has `isolation: worktree`, and the `project/` of the default sandbox has no commit.
   So a second headless turn ran `implementer` alone in a separate sandbox, `--dir /tmp/claude-p42/sb`, after one empty commit in its `project/`.

## Results

- `just check`: exit 0, with 2114 tests that pass and 0 that fail.
- No file of `src/plugins/dotclaude/` has `maxTurns`.

| Agent | Model of its requests | Report |
| --- | --- | --- |
| `debugger` | `claude-opus-5-5` | Yes |
| `implementer` | `claude-sonnet-5-5` | Yes, in the second turn |
| `investigator` | `claude-haiku-5-5` | Yes |
| `planner` | `claude-opus-5-5` | Yes |
| `researcher` | `claude-sonnet-5-5` | Yes |
| `reviewer` | `claude-opus-5-5` | Yes |

- In the first turn, `implementer` did not start, with the error `Failed to resolve base branch "HEAD": git rev-parse failed`.
  The cause is the empty repository of the sandbox, not P42.
- In the second turn, `implementer` ran in its worktree under `.claude/worktrees/` and reported.
- The stream shows the model of each request, but not its effort.
  The effort of `debugger` is not measured here, and the `roster` test pins `effort: medium` in its file.

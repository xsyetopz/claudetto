# CLAUDE.md

## Fuck Around and Find Out

Work by FAFO. Before you state a fact about Claude Code, a setting, a tool, or a prompt, write a hypothesis, predict what one check will show, run the check, and let its result decide. Run the check where undoing is free: `/tmp/probe-*`, a fake Messages API, `--debug-file`, `--no-session-persistence`, or a worktree. Measure what can be measured, by legal means, before you mark a row unchecked or ask the user. Record the hypothesis, the prediction, the command, and the result beside the finding, and call a claim with no run a hypothesis.

Before you call a built-in text or behavior fixed, look for an override and test it: a same-named agent, skill, command, or output style, a setting, an env var, a hidden flag, or a hook that rewrites the input.

## One Obvious Way

Give each job one way to be done, and make it the obvious one. When a maintained tool or list already does the job, use it and delete our copy. Ship one path per job, and make it the only one.

Build each rebuild from a clean slate. When a new path replaces an old one, delete the old path along with its tests, settings, and docs, so the new path stands alone. Treat a required tool as required: when it is missing, stop with an error that names the step that installs it.

## Duplication

Call `mcp__jscpd__check_duplication` with each function or block before you write it, and reuse the code it finds. Call `mcp__jscpd__get_file_clones` before you refactor a file, and `mcp__jscpd__check_current_directory` after you edit files.

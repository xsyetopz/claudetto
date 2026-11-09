# CLAUDE.md

## Fuck Around and Find Out

Work by FAFO. Before you state a fact about Claude Code, a setting, a tool, or a prompt, write a hypothesis, predict what one check will show, run the check, and let its result decide. Run the check where undoing is free: `/tmp/probe-*`, a fake Messages API, `--debug-file`, `--no-session-persistence`, or a worktree. Measure what can be measured, by legal means, before you mark a row unchecked or ask the user. Record the hypothesis, the prediction, the command, and the result beside the finding, and call a claim with no run a hypothesis.

Before you call a built-in text or behavior fixed, look for an override and test it: a same-named agent, skill, command, or output style, a setting, an env var, a hidden flag, or a hook that rewrites the input.

## One Obvious Way

Give each job one way to be done, and make it the obvious one. When a maintained tool or list already does the job, use it and delete our copy. Ship one path per job, and make it the only one.

Build each rebuild from a clean slate. When a new path replaces an old one, delete the old path along with its tests, settings, and docs, so the new path stands alone. Treat a required tool as required: when it is missing, stop with an error that names the step that installs it.

## Articles

Write the root prompt, tool and agent descriptions, and hook texts in block language, the instruction register of labels, notices, and recipes (Quirk et al. 1985, pp. 845–46 and 900). Drop "the" before a noun whose referent the reader already holds, such as user, repository, project, or code: "Read code before you describe or change it." Keep each article that does work:

- Keep "a" or "an" where it means any one, as in "write a failing test". Dropping "a" costs a model more accuracy than dropping "the" (arXiv 2505.00019).
- Keep the article before a noun that also reads as a verb (check, run, change, test, fix, call, request, report, rest), so the phrase parses one way.
- Keep the article where dropping it makes a garden path, as in "the scope the user set".
- In a series, write the article once, before the first item: "a remark, brainstorm, or pasted material" (ASD-STE100).

Replies to the user, docs, and the changelog keep full articles.

## Duplication

Call `mcp__jscpd__check_duplication` with each function or block before you write it, and reuse the code it finds. Call `mcp__jscpd__get_file_clones` before you refactor a file, and `mcp__jscpd__check_current_directory` after you edit files.

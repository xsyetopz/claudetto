# Contributions

This page covers how dotclaude checks a contribution to a project that you do not own.
It is for a user who lets Claude write a commit, a push, a pull request, an issue, a discussion, a review, or a comment.

A commit, push, pull request, issue, discussion, review, or comment in a project that you do not own speaks for you.
Maintainers read it as your words.
The `guard` slice asks before Claude reaches the project of another owner.

## The Policy Ask

The `guard` slice asks once for each repository in a session.
It asks when Claude reaches a GitHub repository of another owner that has a policy file.
The policy files are the ones in `POLICY_FILES` in `src/plugins/dotclaude/slices/guard/domain/owners.ts`: `CLAUDE.md`, `AGENTS.md`, and `AI_POLICY.md`.
The ask covers these calls, which `reachedRepos` finds:

- Bash: `git clone`, `gh`, `curl`, or `wget` on the repository.
- `WebFetch` of a page of the repository.

The steps are:

1. The `guard` reads your logins with `gh config get user -h github.com` (`LOGIN_ARGV`).
2. It reads the organizations where you are an admin with `gh api user/memberships/orgs` (`ORGS_ARGV`).
   A repository of you or of such an organization is yours, and the ask skips it.
3. For another owner, it reads each policy file with `gh api`.
4. `policyReason` wraps each file in `<policy_file name=...>`, and it XML-escapes the text.
   A file that is longer than `POLICY_FILE_MAX_CHARS` (`2_000` characters) is cut, and `[cut]` marks the cut.
5. The ask shows the policy text in the prompt.

Each `gh` call stops after `POLICY_TIMEOUT_MS` (`5_000` milliseconds).
`src/kernel/budget.ts` sets this value.
The ask fails open.
The output is null when `gh` is missing.
It is also null when you are logged out.
It is also null when the call is slower than the timeout, or when it exits with a code other than `0`.
A repository with no policy file continues without the ask.
The owner list is kept only when both `gh` calls answer.
So a failed call runs again at the next check.
The ask keeps a list of the repositories that it checked, for each session.

A project with no policy file is unknown, not permitted.
Read its `CONTRIBUTING.md` yourself before you write to it.

## What to Do When It Asks

1. Read the policy text in the prompt.
2. If the policy forbids AI work, reject the call.
3. If the policy allows AI work, allow the call.
   Follow what the policy asks, such as a disclosure line.
4. Review each draft before you send it.

> **Note:** Maintainers spend time on each report.
> A report that nobody checked, or that is long and vague, costs them that time.
> It also costs you their trust.

## Public Writes

The `prompt` slice adds `permissions.ask` rules to the [settings snippet](Settings-Snippet).
The rules cover these public writes:

- `gh pr create`, `gh pr merge`, `gh pr comment`, and `gh pr review`.
- `gh issue create` and `gh issue comment`.
- `gh release`.

Claude asks before each of these calls runs.
A contribution is public, and it stays after a removal.
The decision is yours.
See [Guards](Guards) for the other checks of the `guard` slice.

## Work on This Repository

The repository rules are in `CLAUDE.md` at the repository root.
Run `just check` before you call a change done.
Edit the source in `src/`, and run `just generate`.
A test fails when a generated file differs from its source.
Do not edit `plugins/` by hand.

## Related Pages

- [Guards](Guards): the checks of the `guard` slice.
- [Install](Install): how to copy the settings snippet.

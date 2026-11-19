---
status: accepted
date: 2026-11-19
---
# The Commit Trailer Credits Claude's Account

## Context and Problem Statement

claudetto's git instructions follow the Linux kernel's rules for AI agents: the agent never adds `Signed-off-by`, the human submitter reviews and certifies the change, and tool use is disclosed (`Documentation/process/coding-assistants.rst` and `generated-content.rst`, torvalds/linux master, read 2026-11-19). Setup filled `attribution.commit` with `Assisted-by: Claude Code` (REQ-GUARDS-063). That line discloses the tool, but no git host credits it to anyone, so the assistance never shows as a contributor.

Facts, checked 2026-11-19:
- GitHub counts a co-author only from a `Co-authored-by: name <email>` trailer whose email belongs to an account (docs.github.com, "Creating a commit with multiple authors").
- GitLab writes co-authors in the same trailer form (`%{co_authored_by}`, docs.gitlab.com, "Commit message templates").
- GitHub links `noreply@anthropic.com` to the `claude` login: GraphQL `Commit.authors` for cd87e6696 in this repository returns `{name: "Claude", user: {login: "claude"}}`.
- Vanilla 2.1.327 writes `Co-Authored-By: <model name> <noreply@anthropic.com>` (chunk-m14bt1pz.js:1813488).
- The contribution certificate the item cites allows either `Assisted-by` or the harness's own co-author trailer (external/please-use-me-often/agent-terms/CONTRIBUTION-CERTIFICATE.md:22).

## Decision Outcome

Setup fills `attribution.commit` with `Co-Authored-By: Claude <noreply@anthropic.com>`: one trailer, no `Signed-off-by`, in the form hosts link to an account. The name stays `Claude` because the setting is one static line and the account it resolves to is the same for every model. `attribution.pr` keeps `Assisted-by: Claude Code`, because a pull request body credits no one and the line only discloses the tool. A settings file holding the retired `Assisted-by: Claude Code` commit value gets the new one at the next fill; a value the user wrote stays.

## Consequences

- Commits made with claudetto list Claude as a co-author on GitHub, and GitLab reads the same trailer.
- The kernel rule against an agent `Signed-off-by` stays in force through REQ-GUARDS-063.

Source: user decision, 2026-11-19 (this session): claudetto's git instructions follow the kernel's AI agent rules in a form git hosts recognise as a contributor.

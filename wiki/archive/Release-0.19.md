# Release 0.19

This page records the notes of the `0.19` release, with its patch `0.19.1`.

Released 2026-10-03.
This release adds guards for infrastructure, dependency, and TLS commands.
It adds a delegation note, desktop notices, and auto-clear at 100k tokens.
A version in parentheses marks a later patch of this line.
An entry with no version comes from 0.19.0.

## Added

### Guards

- `DesignSync`: a call that changes a Claude Design project asks first, unless the session started the `/design-sync` skill.
  The tool description requires that skill.
  A 0.18.1 session uploaded files without it.
  The read methods pass.
  `guard_bash` controls it.
- `Bash` guard, infrastructure: asks before commands that destroy resources or apply changes with no review.
  Examples are `terraform destroy`, `terraform apply -auto-approve`, `pulumi destroy`, `cdk destroy`, `kubectl delete`, `helm uninstall`, `aws s3 rm --recursive`, `gcloud … delete`, `az … delete`, and `fly apps destroy`.
  The reason names the target when a file shows it.
  Examples of such a file are the kubeconfig context, `AWS_PROFILE`, or the Terraform workspace.
- `Bash` guard, dependencies: asks before a command adds a new dependency.
  Examples are `npm install <name>`, `pip install <name>`, `uv add`, `cargo add`, and `go get`.
  The reason names each package.
  It asks Claude to check that the package exists and that the task needs it.
  A bare install, a requirements file, an editable install, and a lockfile install pass.
- `Bash` guard, TLS: asks before a command turns off TLS checks.
  Examples are `curl -k`, `wget --no-check-certificate`, `NODE_TLS_REJECT_UNAUTHORIZED=0`, `GIT_SSL_NO_VERIFY`, `git config http.sslVerify false`, and `pip --trusted-host`.
- `Bash` guard, tests: asks before `rm` or `git rm` removes a tracked test file.
  It also asks before `mv` moves one.
  The database reset ask also covers `prisma db push --accept-data-loss` and `drizzle-kit push --force`.
- Edit guard, proofs: asks when an edit adds a proof escape in a `.lean`, `.v`, `.thy`, `.agda`, or `.idr` file.
  Examples are `sorry`, `admit`, `Admitted`, `axiom`, `postulate`, and `native_decide`.
- Edit guard, TLS: asks when an edit turns off TLS checks in code.
  Examples are `verify=False`, `rejectUnauthorized: false`, and `InsecureSkipVerify: true`.
- Test-edit approval: one approved ask for a test edit passes the other test-edit asks until the next message of the user.
  A test edit is removed assertions or a skip marker.
  A removed or moved test file is a separate kind, with its own approval.
  A denied ask records nothing.
  `user-prompt-submit/clear-ask-approvals.mjs` ends the approval at the next user message.
  Task notifications do not end it.

### Rules, Gate, and Options

- Two working rules: Claude edits files with `Edit` or `Write` and not with shell scripts.
  Claude follows the limits that a tool description gives.
  A skill or command is named only when it is in the skill list of the session.
- Verification gate: counts more check forms.
  Examples are `lake build`, `coqc`, `verilator --lint-only`, `yosys`, `pio test`, `idf.py build`, `west build`, `dbt test`, `sqlfluff lint`, `jupyter nbconvert --execute`, and `godot --headless`.
- `context_compaction_handoff` (on by default): before a main-conversation compaction, the main model writes a handoff note.
  dotclaude saves it under `.claude/handoffs/` and adds it to the compacted conversation.
  If the model gives no note in 60 seconds, the compaction runs without it.
- `context_auto_clear` (on by default): from 100k tokens of main context, the next typed prompt saves a handoff note and runs `/clear`.
  - The prompt then comes back as the prompt of the user.
    The `SessionStart(clear)` hook adds the full note.
  - If the note fails, the prompt goes on with no clear.
  - The status line shows `clear` in red from that size.
  - With the option off, the context note asks Claude for a handoff, as before.
- `notify_desktop` (on by default): sends a desktop notification when the main agent ends a turn.
  It also sends one when Claude asks a question or when Claude Code asks for a permission.
  - The new `Notification` hook `notification/notify-permission.mjs` sends the permission notice.
    It shows the task, the short session ID, and the repository.
    It uses `terminal-notifier` or `osascript`.
  - A notice with no answer gets one reminder after 5 minutes.
  - A question gets one notification.
    A turn that the user stops with Esc gets none.
    When neither sender exists, nothing shows and nothing fails.
- Delegation note (0.19.1): Claude gets one note for each message after 12 read calls in the main conversation.
  - The count starts at the last user message.
    An `Agent` call between the reads resets it.
    A read call is `Read`, `Grep`, `Glob`, or a `Bash` command that only reads.
  - The note gives the rest of the reading to `dotclaude:investigator`.
    It gives the edits to `dotclaude:implementer`.
  - Since 2026-09-28 the median message had 1 read call.
    12 is about the 83rd percentile.
  - `usage_notes` controls it.
    `DELEGATION_NOTE_READS` in `hooks/lib/_budget.mjs` sets the bound.
- `scripts/usage-report.mjs`: prints the delegation share.
  It gives subagent runs per 100 main turns, runs by agent type, and the tool-result tokens that enter the main context for each session.
  It also lists the latest subagent runs with their cost and the first line of their hand-back.
  The `--runs` flag sets how many.
- Evals (0.19.1): role evals `t5-investigate` and `t5-web-research`.
  The `just eval-agent <model> <effort>` recipe runs them at a subagent model and effort.

## Changed

- `scripts/usage-report.mjs` reads the context bound from `MAIN_CONTEXT_TOKENS`.
- Working rules, investigation: check a correction against the evidence.
  Treat a cause that the user suggests as a hypothesis.
  Change nothing when a reproduction shows no defect.
  Take constants from a source.
- Working rules, code and report: reuse existing mechanisms, and keep compatibility only for a named consumer.
  Label substitutes, check the named outcome, and fix a failing check at its cause.
  The final report names workarounds, substitutes, and the level that each check reached.
- Subagent rule: it now routes work to agents (0.19.1).
  Before, it kept work in the main conversation.
  The main agent did almost all work itself.
  The main conversation coordinates.
  It gives the reading of more than a few files, log scans, and multi-file edits to a subagent.
  The agent descriptions now say when to delegate.
- `model_lock` (0.19.1): with the option on, the definition of a dotclaude agent sets its model.
  dotclaude removes a `model` that an `Agent` call gives.
  No deny reason names a model to use.
  Before, 175 `implementer` runs used Opus 5.5 because a call set `model: "opus"`.
- `investigator` and `web-researcher` (0.19.1): run on Sonnet 5.5 at `medium`, from Opus 5.5 at `medium` and `low`.
  They mostly read and summarize.
  The cost guidance of Anthropic gives such steps to a cheaper model.
  It names `medium` as the start for multi-step tool use.
- `reverse-engineer`: stays on Opus 5.5.
  It has no role eval, and a wrong reading of machine code is expensive to find later.
  It marks a value that it did not recover as unknown.
- `reviewer` reads staged changes.
  It flags weakened checks and packages that do not exist.
  It has a new `comments` lens for pull request review comments.
- `web-researcher` quotes the passage that it cites.
  It searches for sources that contradict the claim.
  The `slices` skill checks a finding at its `path:line` before a fix agent starts.
- `/dotclaude:setup` (0.19.1): uses CodeGraph through the `codegraph explore` command.
  It removes the `codegraph` MCP server after `codegraph install`.
  - The MCP server sends fixed instructions that tell Claude not to give lookups to a subagent.
    No setting turns them off.
  - Each run also removes a `codegraph` MCP server that is registered.
    `codegraph upgrade` can add it again.
  - The agents run `codegraph explore` through `Bash`.
    No agent lists the MCP tool.
- `Bash` guard parser: reads quotes, heredocs, and command substitutions in one pass.
  - Before, three scanners with different quote rules let these commands pass.
    They were a command after a here-string `<<<`, and a `$(...)` inside double quotes.
    They were also a quoted `{` that split a `git push --force`, and a `$(...)` in an unquoted heredoc body.
  - These forms now get a finding.
    They are a heredoc `<<` inside `((...))`, and a `case` pattern `)` inside `$(...)`.
    They are an unquoted `{` after a command name, `$'\x72'` and octal escapes, and a shell option value before `-c`.
    They also include nesting past the parse limit.
  - One list of interpreters, with versioned names such as `python3.12`, controls the scan of inline code.
    The guard reads the code only from `-e`, `-c`, or `--eval`.
    It also scans a heredoc that goes to `python3 -` or `node -`.
  - `uv run`, `uvx`, `uv tool run`, `poetry run`, `pdm run`, and `pipenv run` are wrappers.
    The guard checks the command that they start, also after global flags such as `uv --directory x run`.
  - An ignore-bypass search that would walk large ignored directories gets a deny reason.
    The reason keeps the flag and asks for named or excluded directories.
  - `git push --force-with-lease` asks with a reason that names the lease.
- Verification gate, classes: sorts each check into `run` (tests, build, type check) or `static` (lint, format, analyzers).
  - After a code edit, a `static` check alone does not satisfy the gate or the task gate.
    This applies when the project has a test command.
  - A failed `run` check stays reported until a later `run` check passes.
    A lint run that passes after it does not clear it.
    A run of the project own test command counts as a check.
- Verification gate, forms:
  - Workspace and toolchain forms count.
    Examples are `pnpm -r test`, `npm --prefix app run build`, `yarn workspace web test`, `cargo +nightly test`, and `deno task test`.
  - Task runner names count.
    Examples are `turbo run test`, `nx run-many -t test`, `nx run web:lint`, `moon run :test`, `mise run lint`, `rake spec`, `./gradlew :app:jvmTest`, and `mvn verify`.
    A name that only fixes or formats does not count.
    Examples are `lint:fix` and `spotlessApply`.
    `npm ci` does not count.
  - The gate reads the command inside a launcher.
    Examples are `npx`, `bunx`, `pnpm dlx`, `bundle exec`, `rustup run`, `conda run`, `nix develop -c`, `docker run`, `docker compose run`, `python -m`, and `c8`.
  - A command that shows help, a version, or a list does not count.
    A command that skips the run does not count.
    A command that changes files does not count either.
    Examples are `pytest --collect-only`, `cargo test --no-run`, `make -n test`, `eslint --fix`, `ruff format`, and `npm run lint:fix`.
  - `--dry-run` is a no-check flag only for tools that skip the run with it.
    Examples are `make`, `just`, `gradle`, `turbo`, `mocha`, and `rspec`.
    For a formatter, `--dry-run` is the check.
  - Detection is in `hooks/lib/_check-command.mjs`.
    It covers the usual check tools of Python, JavaScript, Rust, Go, the JVM, Swift, .NET, C and C++, and Ruby.
    It also covers PHP, Elixir, Haskell, Dart, Lua, shell, Nix, and infrastructure.
    A formatter counts only in its check form.
    Examples are `prettier --check`, `gofmt -l`, and `black --check`.

## Removed

- Assertion ask exception: the Edit and `Bash` guards no longer drop the assertion ask when the last prompt asks to remove tests.
  A regex on the words of the prompt decided that.
  It fails on other wordings and other languages.
  One approval now covers the other asks of its kind until the next user message.
  `io.session.lastPrompt` had no other caller, so it is removed too.
- Fast-compact integration (Jev by TypeSafe): users report that Jev compacts badly.
  The dotclaude eval found its picks no better than keeping the newest outputs.
  `/dotclaude:setup` no longer offers, installs, configures, or reports it.

## Fixed

- Change attribution (0.19.1): Claude finds the tool call that made a change before it says who made it.
  Claude says that it does not know when it finds no call.
  Before, the `handoff` skill told Claude to name each other uncommitted change as the work of the user.
  Claude then called a file that it had made "not this session's work".
  The next session repeated the claim.
  The working rules, the subagent conventions, and the `handoff` skill have the check.
- `/dotclaude:setup` preview (0.19.1): the `CLAUDE.md` preview lists the lines that the new block drops.
  It says that a later dotclaude version removed them on purpose.
  A 0.19.0 session read the `# Compact instructions` section as the user's text.
  The section was one that 0.18.1 removed.
  The session moved the end marker to keep it.
- `/dotclaude:setup` cleanup (0.19.1): removes the `# Compact instructions` section from `~/.claude/CLAUDE.md`.
  It does so when the section sits outside the block as an exact copy of an earlier dotclaude version.
  The compaction hook sends the same priorities.
  A section that the user changed stays.
- Nested-instructions hook: stops at the root of a git worktree.
  In `.claude/worktrees/*`, it loaded the main `CLAUDE.md` again.
  It did so 192 times in 193 runs.
- `DOTCLAUDE_DEBUG`: with it set, an action error in the module engine reaches Claude Code.
  Without it, the action is skipped as before.
  An engine hook error skips all of dotclaude for the event.
- Inline code guard: code that starts a shell command as an argument list got no finding.
  Examples are `subprocess.run(['rm', '-rf', '/'])` and `system("rm", "-rf", "/")`.
  The guard now also checks each comma-separated run of string literals as one command.
  It checks backtick bodies, Perl `qx` and `qw`, Ruby `%x` and `%w`, and AppleScript `do shell script`.
- `scripts/sandbox.mjs`: removed each `DOTCLAUDE_` variable.
  This includes one that the user set on the command line, such as `DOTCLAUDE_DEBUG`.

## Related Pages

- Previous: [Release 0.18](Release-0.18)
- Next: [Release 0.20](Release-0.20)
- [Archive](Archive): the index of the archived pages.

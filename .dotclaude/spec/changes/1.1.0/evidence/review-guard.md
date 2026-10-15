# Review of the Guard Slice (P88)

A `reviewer` run did the review on 2026-10-14, read only.
The main session wrote this file from its report.
The main session gave the run 2 leads from this session:
the deny of `git --super-prefix x/ version` in the P85 review run, and the file-print deny of compound commands.

## Confirmed Findings

### I10 over-refusal: a `git` global option with a separate value reads as a substitution

Lead 1 is confirmed.
The matcher is `git.discard-uncommitted` at `src/plugins/dotclaude/slices/guard/domain/matchers/git.ts:121`.
`gitOf` at `src/plugins/dotclaude/slices/guard/domain/walk.ts:29-37` drops `--super-prefix` and keeps its value `x/` as the verb, because `GIT_VALUES` at `walk.ts:16-22` does not list `--super-prefix`, `--config-env`, or `--attr-source`.
The verb `x/` fails `LITERAL`, and the matcher then denies as for an unreadable substitution.
The rule is for a word that a substitution wrote, but `x/` is a literal word.

```sh
bun -e '...guardReason(c, { subagent: true, ... })...'
```

```text
"git --super-prefix x/ version 2>&1 | head -2; grep -n a b" ["git","x/","version"] git.discard-uncommitted DENY
"git --config-env a=B status" ["git","a=B","status"] git.discard-uncommitted DENY
"git --super-prefix=x/ version" ["git","version"]  allow
```

Failing test:

- Input: `git --super-prefix x/ version` given to `guardReason`, with `subagent` `true`.
- Expected: `null`.
- Actual: the reason "dotclaude forbids this destructive action."
- Test file: `tests/dotclaude/guard/matrix/floor.test.ts`.

### I10 over-refusal: the file-print deny of a compound command (P144)

Lead 2 is confirmed for a list in which one part prints a file.
`printsOf` at `src/plugins/dotclaude/slices/guard/domain/reads.ts:131-148` checks each part alone.
The reason at `src/plugins/dotclaude/slices/guard/domain/deny.ts:22` says "This command only prints a file", which is false when the other parts do other work.
`tests/dotclaude/guard/print.test.ts:71-86` requires this behavior, so P144 must change that test too.

```text
"sed -n 140,150p tools/limits.ts; cd tools && awk 1 limits.ts | wc -l; grep -n x limits.ts"
  prints: [{"file":"tools/limits.ts","offset":140,"limit":11}]
  deny: "This command only prints a file."
"head -3 package.json; git status --short"  deny: "This command only prints a file."
"grep -c x package.json; tail -2 package.json"  deny: "This command only prints a file."
```

Failing test:

- Input: `sed -n 140,150p tools/limits.ts; grep -c x package.json`.
- Expected: `null`, or a reason that does not say "only".
- Actual: the reason "This command only prints a file."
- Test file: `tests/dotclaude/guard/print.test.ts`.

## Unconfirmed Findings

- Lead 2, first example: the run's version, with real paths in place of the `…` parts, has no print part, and `printsOf` gives `[]` and no deny.
  The deny in the session must have come from an elided part, such as `head -N F` or `sed -n`.
- A possible bypass: `git --attr-source HEAD reset --hard` reads as verb `HEAD`, and the guard allows it.
  The `git` manual lists only `--attr-source=<tree-ish>`, and no `git` source is in the workspace.
  So the run could not show that `git` accepts the separate value.
- The guard stopped this read-only probe as a destructive action, and the run did not run it another way.

```sh
git version; git --attr-source HEAD version; echo "exit=$?"; git --config-env a=HOME version; echo "exit=$?"; git --super-prefix x/ version; echo "exit=$?"
```

- The brief's lead of tests of prose at `tests/dotclaude/guard/large.test.ts:19-35` is rejected in part.
  The assertions check data, such as the file path and that the deny has no range.
  The negative assertions on `` `offset` `` and `Infinity` depend on the format of the reason.
  If the label changes, they pass when the range is still there.
  No command shows that a regression gets through.

## Checked With No Finding

- I07: the floor matchers in `git.ts`, with `just test tests/dotclaude/guard`: 104 pass and 0 fail.
- I17: `kindOf` at `src/plugins/dotclaude/slices/guard/adapters/mod.ts:74-85` reads only `ENOENT` as missing, and any other error as a folder, so it fails closed.
  `readOf` at `mod.ts:43-53` keeps a failed `gh` call apart from a 404.
- Silent `catch`: none in the slice.
- Bound outside `limits.ts`: `READ_MAX_BYTES` is only in `src/plugins/dotclaude/slices/guard/limits.ts`.
  `count = 10` at `reads.ts:86` is the default of `head`, not a project bound.
- Copy of kernel code: `parts` at `reads.ts:49-82` records pipes, and kernel `parse` does not, so `parts` is not a copy.
- Test that cannot fail, skip, or `only`: none found.
- I15: `shared-git.test.ts:154` and `win-paths.test.ts:73` assert that the reason repeats the command, which is behavior.
- I01 to I06, I08, I09, I11 to I14, I16, and I18: no code path of the slice applies, and the run did not check them in depth.

---
name: dry
description: Finds duplicate code with jscpd and decides which clones to merge. Use after a change that adds or copies code, or when the user asks about duplication or DRY.
allowed-tools: Bash(jscpd-config *)
---

Duplicate code costs the same fix in two places.
Find the clones, and merge only those that must change together.

## Find Clones

Run jscpd when a change copies a block of code, before you finish a change that adds many lines, and when the user asks about duplication.

1. Write the config: `jscpd-config`.
   It merges `jscpd.local.json` and its `extends` chain into `.jscpd.json`.
   With no `jscpd.local.json`, it writes the shipped base.
2. Run `jscpd-config --run`, with the paths to scan as arguments.
   It runs `bunx jscpd` with `BUN_TMPDIR` set to `TMPDIR`.
   The sandbox allows writes to `TMPDIR`, so the run needs no `dangerouslyDisableSandbox`, and the call has no env prefix, so it needs no prompt.

On the first run there is no `.jscpd-baseline.json`, so `jscpd-config` leaves out `baseline` and `failOnNewClones`.
The run then scans and reports each clone.
Decide on the clones first, and make the baseline after that (see "When to Merge").
When the baseline file exists, `jscpd-config` sets `baseline` and `failOnNewClones: 0`, so only a new clone fails the run.

`jscpd.local.json` sets the project rules.
`"extends": "claudetto:base"` takes the shipped base, and a path takes another file.
In a list that starts with `ignore`, the local items append to the base.
`<key>Remove` takes items out of the list of the base, and `null` deletes a key.
Add a format in `formatsExts`.
The base has `semantic`, which needs a large model download, so set `"semantic": null` when the user did not ask for it.

## Read a Clone

A clone report names two files, a line range in each, and the token count.

1. Read both ranges.
2. Ask what makes the two blocks change together.
   A rule, a format, or a protocol that both blocks follow is a reason to merge.
3. Ask what makes them differ.
   Two blocks that look equal now but serve different rules will drift apart.

## When to Merge

Merge when one change of the rule must change both blocks, and the blocks have the same behavior and the same effects.
Do not merge when the blocks only look alike, when the merge needs a flag or a callback for each difference, or when the merge makes the code longer.
A merge is good when the behavior and the effects stay the same, and the code gets shorter.

- Keep the shared part in one function that both sites call.
- Run the tests before and after the merge, and expect the same result.
- Put a clone that you keep on purpose in the baseline, with `jscpd-config --run --baseline .jscpd-baseline.json --update-baseline`, and run `jscpd-config` again.
  Say why in your reply.

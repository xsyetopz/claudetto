---
name: dedupe
description: Finds duplicate code with `jscpd` and decides which clones to merge. Use after a change that copies code, or when asked about duplication.
---

Duplicate code costs the same fix in two places.
Find the clones. Merge only those that must change together.

## Find Clones

Run `jscpd` in these cases:

- A change copies a block of code.
- You are about to finish a change that adds many lines.
- The user asks about duplication.

Run this command, with the paths to scan as arguments:

```sh
bunx jscpd --no-tips <path>...
```

`jscpd` reads the `.jscpd.json` at the root of the project. Name the paths yourself, because the `path` list of a config can name a folder the project no longer has, and `jscpd` stops on it.
A project without `.jscpd.json` runs on the defaults of `jscpd`.

When `.jscpd-baseline.json` exists, add `--baseline .jscpd-baseline.json --fail-on-new-clones 0`. Then only a new clone fails the run.
On the first run there is no baseline, so the run scans and reports each clone.
Decide on the clones first. Make the baseline after that (see "When to Merge").

## Read a Clone

A clone report names two files, a line range in each, and the token count.

1. Read both ranges.
2. Ask what makes the two blocks change together.
   A rule, a format, or a protocol that both blocks follow is a reason to merge.
3. Ask what makes them differ.
   Two blocks that look equal now but serve different rules will drift apart.

## When to Merge

Merge when one change of the rule must change both blocks. Merge only when the blocks have the same behavior and the same effects.
Keep the blocks separate in these cases:

- The blocks only look alike.
- The merge needs a flag or a callback for each difference.
- The merge makes the code longer.

A merge is good when the behavior and the effects stay the same, and the code gets shorter.

- Keep the shared part in one function that both sites call.
- Run the tests before and after the merge. Expect the same result.
- Put a clone that you keep on purpose in the baseline: run the command again with `--baseline .jscpd-baseline.json --update-baseline`.
  Say why in your reply.

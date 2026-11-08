# Fixtures: upstream OpenSpec records

Each JSON file is a list of records of upstream's behaviour: `file` and `test` (the vitest case it came from), `kind` (the function called), `args`, the `before` and `after` file trees, and the `outcome` (`returned` or `threw`). `fixtures.spec.ts` replays them through the plugin's code.

- Upstream version: `@fission-ai/openspec` 1.16.0 (tag `v1.16.0`, commit 27c0515724de). The source checkout the test names come from is `/tmp/openspec-src/repo` (`package.json` version 1.16.0), and `node_modules/@fission-ai/openspec` here is 1.16.0.
- How they were recorded (inferred from the records' shape, not from a script): upstream's own vitest cases (`test/core/*.test.ts`) run against that checkout, each call to a function writing its arguments, the trees before and after, and the outcome (tree roots are the cases' `mkdtemp` names, stored as `$ROOT`). The recorder script is not in this repository and was not found in `/tmp`, so there is no command to repeat; to re-record, rerun those vitest cases against 1.16.0 with such a wrapper.
- Counts below are the records in each file (`returned` plus `threw`); the replay's own tally per file prints at the end of `bun test` (`pass`, `diverged: ...`, `not wired`, `upstream threw: plugin ...`).

| file | records | returned | threw |
|---|---|---|---|
| archive | 304 | 235 | 69 |
| misplaced-delta-files | 27 | 27 | 0 |
| specs-apply.comment-masking.security | 2 | 2 | 0 |
| specs-apply.fence-preservation | 16 | 16 | 0 |
| specs-apply.line-endings | 12 | 12 | 0 |
| specs-apply.project-linked-spec | 17 | 12 | 5 |
| specs-apply.requirement-name-near-miss | 30 | 19 | 11 |
| specs-apply.salvage | 28 | 28 | 0 |
| specs-apply.security | 12 | 8 | 4 |
| specs-apply.serialization | 14 | 14 | 0 |
| specs-apply.symlink-escape.security | 2 | 2 | 0 |
| task-checkboxes | 41 | 41 | 0 |
| task-numbering | 7 | 7 | 0 |
| validation.archive-preflight | 72 | 54 | 18 |
| validation.enriched-messages | 3 | 3 | 0 |
| validation | 64 | 64 | 0 |
| validation.purpose-placeholder | 12 | 12 | 0 |
| validation.scenario-body-parity | 5 | 5 | 0 |
| validation.scenario-loss | 47 | 36 | 11 |
| validation.scenario-steps | 17 | 17 | 0 |
| validation.skip-specs | 25 | 25 | 0 |
| validation.unknown-metadata-keys | 6 | 6 | 0 |
| total | 763 | 645 | 118 |

## Replay tally

`env -u CLAUDE_CODE_SESSION_ID bun test ./plugins/claudetto-openspec/hooks/fixtures.spec.ts ./plugins/claudetto-openspec/hooks/upstream.spec.ts` gave 743 pass, 0 fail. Every record is counted `pass`, `diverged: <named reason>`, `upstream threw: plugin threw`, or `excluded: <reason>`; no `not wired` line prints. The reasons are in `fixtures.spec.ts` (`notReplayable`, `archiveExcluded`, `divergence`, `flagDivergence`).

Exclusions: 33 archive cases and 2 clock cases whose own body uses `vi.spyOn`, `vi.mock`, or fake timers (titles in `archive-injected.json`, classified against `test/core/archive.test.ts` in the upstream checkout); 7 `validateChange` cases (a proposal-prose pass that archive prints and never blocks on; `validate` never calls it); 5 `writeUpdatedSpec` cases that threw on a swap injected with `vi.spyOn`; 4 cases with an fs failure injected with `vi.mock`; 2 comment-masking cases whose delta is generated at test time; 7 archive cases with a link to a target outside the tree; 5 `retireSpec` unit cases (caller-chosen target and root, injected failures, or a return value the plugin has no analogue for; retirement itself is replayed through `archive.execute`).

# Dogfood on Vanilla Claude Code 2.1.327

`run.sh` starts Claude Code 2.1.327 in tmux with an isolated config dir. It runs Sonnet 5.5 with claudetto and claudetto-you-should-know loaded from a second clone, and uses a fresh clone of HEAD as the working repo.

## Register Check

`bun tools/check-register.ts` applies the rules below and exits 1 when it lists an item. It also lists an item whose text carries two different `Likelihood: N` values, because such an item's level cannot be read.

## Register Audit, 2026-11-19

Clone at ba45d6dcf. The session agent parsed `plans/rebuild/risk-register/*.md` with these rules:

- an entry starts at a `- [ ] **RISK-N**` or `- [x] **RISK-N**` line;
- its status is the text after the last `Status:` in the entry, including an inline one;
- an entry whose title reads "Moved Out as OUT-N" is settled.

| Item | Count |
| --- | --- |
| Entries | 427 |
| Likelihood 3 or higher and not closed, accepted, mitigated or moved Out | 0 |
| Neither a Status nor a Moved Out title | 0 |
| Status open (all at Likelihood 1 or 2) | 16 |

The first audit in the same session reported 11 open entries at Likelihood 3 or higher. Its filter read Status only at the start of a line, so it missed a Status that follows `Owner: X.` on the same line. All 11 carry a closed status.

The status line read `claude-sonnet-5-5 | ctx 6% | 7d 9% | cache 98%`.

## Dogfood at 48b68fe1f, 2026-11-19

Probe: `run.sh start`, claude 2.1.327 (`~/.local/share/claude/versions/2.1.327`), Sonnet 5.5, auto mode, claudetto and claudetto-you-should-know loaded.

- Turn 1 ran `bun tools/check-register.ts` (428 items, 0 at Likelihood 3 or higher unsettled, 0 with two Likelihood values, exit 0) and `claude plugin test plugins/claudetto-openspec` (1 pass, 0 fail). It quoted both outputs and changed no file.
- Turn 2 was a read-only lookup. It cited `plans/rebuild/prd/verification.md:14`, quoted the last Status line, and said which claims it had not checked.
- Cache hit was 87% after the cold first turn and 98% after turn 2 (REQ-COST-040).
- No new fault was seen, so no risk-register entry was added. The `⚠` before the status line is the engine's frame for a pinned plugin status (`plugins/claudetto/hooks/statusline/statusline.ts:44`).

The same day, `claude plugin test` on the three plugins under claude 2.1.328 gave claudetto 128 pass, claudetto-openspec 1 pass, claudetto-you-should-know 160 pass, 0 fail each.

## Dogfood at fea3d5562, 2026-11-20

Probe: `run.sh start`, claude 2.1.327, Sonnet 5.5, auto mode, claudetto and claudetto-you-should-know loaded. The isolated config still held the retired `Assisted-by: Claude Code` commit value.

- Session start replaced it: "replaced attribution.commit Assisted-by: Claude Code".
- Turn 1 asked for a line in this README. The file was untracked in the clone, since `reports/` is gitignored and this README had never been force-added, so the agent reported that and asked before creating it. After a yes it asked how to commit an ignored path and offered a force-add first. Commit d6b4451b0 ends with `Co-Authored-By: Claude <noreply@anthropic.com>` (issue #47, RISK-501).
- Turn 2 made a side branch from HEAD~1, committed there, and answered the ancestry and conflict questions from `git merge-base --is-ancestor` and `git merge-tree`. Both answers matched a recheck (issue #48, RISK-502).
- New fault: a you-should-know card said that later edits to the force-added file would be silently ignored, which is false (issue #65, RISK-510, accepted on a replay in reports/2026-11-20-research/ysk-tool-claim).
- The status line read `claude-sonnet-5-5 | ctx 4% | 7d 40% | cache 99%` after turn 2.

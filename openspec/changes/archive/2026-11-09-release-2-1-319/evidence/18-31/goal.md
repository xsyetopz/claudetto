<role>
Finish task 18.31 of openspec/changes/release-2-1-319/tasks.md: the claudetto plugin passes the held-out set r4 at 24/24 on every run. Read the 18.31 entry in full first; it records every run, fix and measurement so far. Make technical choices yourself and record why. Ask the user only about how output looks to them, or when a choice changes what the bar means.
</role>
<state>
- r4 runs 3-22 (20 runs) give 474/480, every run 23/24 or better, 14 runs at 24/24. Runs 13-22 use the shortened texts of commit a3144659.
- Misses: claim flip in runs 8, 11, 15 and 17; claim drift in run 3; ledger drift in run 20. Claim flip is the one that repeats.
- The held-out run prints counts only, so no output names a failing case. Find and fix causes on public cases only.
- Public set c1 (evidence/18-31/public-c1.json) last scored 24, 23, 24.
</state>
<goal>
1. Write a fresh public set, c2, in r4's style. A new subagent writes it blind: it never reads the plugin's prompt texts or the r4 counts, and it uses none of the phrases those texts quote. Weight it toward claim flip (at least 12 of 24 cases), and keep the case format that `fixture check` accepts. Prefixes must be plain strings, since the loader rejects tool blocks.
2. Grade c2 with `run.ts` three times on the current plugin. For each miss, read `cases.jsonl` and the session logs and record whether the plugin or the judge caused it, with the line that shows it.
3. Fix each plugin cause. When the fix is prompt text, measure the old text against the new on the same samples, at least two runs each, before you keep it. When the cause is the judge, show the misread on a public case, fix the grader, and record it; never tune anything against held-out results.
4. Repeat steps 2-3 until c2 and c1 each pass 24/24 on three runs in a row. Then hand the user the 10-run held-out command.
5. Only after the bar is met, finish the remaining text work recorded under 18.31: the block texts the agent sees (VERIFY_BLOCK fixes), DECIDE_CALL, ROOT_PROMPT, Concise.md and SLICE_OTHERS. Each must get shorter in plain words while measuring no worse than the old text on c1. Also test whether parseFaults should read the last JSON value of a reply, as Anthropic's Sonnet 5.5 page advises, and change it only if a case shows the difference.
</goal>
<method>
- FAFO, per CLAUDE.md: record the hypothesis, prediction, command and result beside each claim in tasks.md under 18.31.
- Probe in marked /tmp/probe-* folders (with .created-by-claudetto), with --no-session-persistence, or in a worktree.
- Write model-facing text the way Anthropic's prompting guide advises: plain words, normal case with no shouted emphasis, no "if in doubt, do X" pushes, and the reason behind a rule when it helps. Use no made-up labels or jargon in text a model or the user reads. A closed list of allowed values stops a model from inventing labels.
- Check each change with its one lab file (`claude plugin test plugins/claudetto`), and run the full lab before each commit. Call jscpd check_duplication before writing code and check_current_directory after edits.
- Commit each measured change together with its evidence files and its tasks.md note.
</method>
<constraints>
- The held-out text stays unread. Never read, list or grep ~/.claudetto-holdout/; the user runs it with their own `! <command>`. Each held-out run folder must end with only the marker, result.json and ledger.jsonl.
- Pass CLAUDE_CODE_OAUTH_TOKEN with `bun --env-file=.env`; keep the .env values unread.
- Keep each graded session under 300,000 tokens. A public or held-out run costs about $2.40.
- Spend at most $60 on public runs (about 25 runs) from 2026-11-08 on, counting the c1 run started that day. If c1 and c2 have not each passed 24/24 three runs in a row by then, stop, record what is still missing under 18.31, and hand the user the 10-run held-out command anyway.
- Stop only processes you started.
</constraints>
<done_when>
- c2 and c1 each pass 24/24 on three runs in a row, with every fix recorded and measured, or the $60 public-run cap is spent and what is still missing is recorded.
- The user's next 10 held-out r4 runs each pass 24/24, and their sums are written under 18.31.
- The text work of step 5 is done or each part names what blocks it.
- `just check` passes and `openspec validate release-2-1-319 --strict` is valid.
- The final message names each open item and the exact step the user takes next.
</done_when>

# Rebuild

## Goal

- [ ] **CON-026** The rebuild goal prompt shall point the agent at the `external/` dossier often and tell it to follow the dossier where it fits; it shall not tell the agent to reuse existing files or to break software engineering practice.
  Acceptance: the goal text names the dossier and holds no line that tells the agent to keep the old files. Verification: inspection.
  Basis: reported, user. Status: unchecked: the goal text is not in the baseline tree.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/b1ac2fdf-4da4-4f95-8340-0d1d068a5d88.jsonl:163, reported, user, 2026-11-16.

- [ ] **CON-027** The goal prompt shall keep mutation testing named (Stryker, mutmut) so the agent knows it.
  Acceptance: the goal text holds both names. Verification: inspection.
  Basis: reported, user. Status: unchecked: the goal text is not in the baseline tree.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/b1ac2fdf-4da4-4f95-8340-0d1d068a5d88.jsonl:265, reported, user, 2026-11-16.

- [ ] **CON-028** Any outdated `openspec/` part shall be curated and wiped, so no stale data stays.
  Acceptance: no `openspec/` file holds a rule that a newer decision replaced. Verification: inspection.
  Basis: reported, user. Status: unchecked: `openspec/` was deleted in 088a227c.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/b1ac2fdf-4da4-4f95-8340-0d1d068a5d88.jsonl:302, reported, user, 2026-11-16.

- [ ] **CON-029** The rebuild goal prompt shall point the agent at the `external/` dossier often and tell it to follow the dossier where it fits; it shall not tell the agent to reuse existing files or to break software engineering practice.
  Acceptance: the goal text names the dossier and holds no line that tells the agent to keep the old files. Verification: inspection.
  Basis: reported, user. Status: unchecked: the goal text is not in the baseline tree.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/b1ac2fdf-4da4-4f95-8340-0d1d068a5d88.jsonl:163, reported, user, 2026-11-16.

- [ ] **CON-030** The goal prompt shall keep mutation testing named (Stryker, mutmut) so the agent knows it.
  Acceptance: the goal text holds both names. Verification: inspection.
  Basis: reported, user. Status: unchecked: the goal text is not in the baseline tree.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/b1ac2fdf-4da4-4f95-8340-0d1d068a5d88.jsonl:265, reported, user, 2026-11-16.

- [ ] **CON-031** Any outdated `openspec/` part shall be curated and wiped, so no stale data stays.
  Acceptance: no `openspec/` file holds a rule that a newer decision replaced. Verification: inspection.
  Basis: reported, user. Status: unchecked: `openspec/` was deleted in 088a227c.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/b1ac2fdf-4da4-4f95-8340-0d1d068a5d88.jsonl:302, reported, user, 2026-11-16.

## Session Rules

- [ ] **CON-032** The agent shall work the rebuild session in this order: check git and the baseline, take one item from the JSON pass/fail list, build, run `just check`, commit, run `just dogfood`, mark the item, and log each login or sudo step in the list.
  Acceptance: each commit follows a green `just check` and a `just dogfood`; the item is marked in the list. Verification: inspection.
  Basis: user goal set through `/goal`, 2026-11-16 15:28 UTC, dogfood and push after each green commit (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:13). Status: missing at 088a227c (a working order, not a code part).
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:490 (goal text, Session); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:4057 (the user still names the list: "stuck at 21/22").

- [ ] **CON-033** The user's orders shall beat queued steps and easier paths, and the goal text shall outrank a handoff.
  Acceptance: when a handoff step conflicts with the latest user order, the order wins. Verification: inspection.
  Basis: user decision, 2026-11-16 15:17 UTC, the handoff is stale; the goal outranks it (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:8192); user decision, 2026-11-16 15:17 UTC, do not trust the handoff as authoritative (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:8206); user decision, 2026-11-16 17:40 UTC, do what the user asked, nothing else (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:4133). Status: missing at 088a227c.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:490 (goal text, first paragraph and Handoff line); reaffirmed at ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:4057.

## Rules of the Rebuild Work

- [ ] **CON-034** Each prompt, hook, or agent change shall be rerun, and a change that does not beat the last run shall not stay.
  Acceptance: a change merged after a prompt, hook, or agent edit has a rerun result that beats the previous one. Verification: inspection.
  Basis: user decision, 2026-11-16. Status: missing at 088a227c.
  Source: user's standing goal, text in `openspec/changes/2-1-325-rearchitecture/goal-overnight.txt` as quoted in ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl turn at line 2677 (handoff, section User's Words); the same goal lines repeat at lines 3402, 4092, 4910, 5630, 6480.

- [ ] **CON-035** Prompts and scorers shall name only the wanted behaviour, never the unwanted words; this holds for workers, skill descriptions and bodies, hooks, and each reply to a human or another agent.
  Acceptance: no prompt, rule, or scorer text lists a phrase to avoid; a grep of agent files, skills, hook texts, and reply rules finds no list of phrases to avoid. Verification: inspection.
  Basis: user goal set through `/goal`, 2026-11-16 15:28 UTC, prompts name only the wanted behaviour (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:13). Status: partial at 088a227c (`plugins/claudetto/hooks/features/prompt/compose.test.ts:78` lists unwanted phrases for a test).
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:2677 (standing goal lines); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:37070 (handoff, constraints; the user calls the habit the Pink Elephant problem and a cheat of the plugin); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:490 (goal text, Targets).

- [ ] **CON-036** Each claim shall be judged on real projects, not on fixtures the agent writes; a green `just check` proves that code runs, not that claudetto works.
  Acceptance: each claim about claudetto's effect cites a run on a real project. Verification: inspection.
  Basis: user decision, 2026-11-16 (date of the handoff that records it; day of decision not recorded). Status: missing at 088a227c.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:2677 (standing goal lines).

- [ ] **CON-037** Work shall run `just dogfood` after each commit and `just dogfood-dir` for uncommitted code, and shall push to origin `feat/2.1.325-rearchitecture` after each green `just check`, never with force.
  Acceptance: no force-push in the branch history; dogfood ran after each commit. Verification: inspection.
  Basis: user goal set through `/goal`, 2026-11-16 15:28 UTC, dogfood and push after each green commit (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:13). Status: missing at 088a227c.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:2677 (standing goal lines); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:490 (goal text, Rules).

- [ ] **CON-038** The agent shall make product choices and deletes itself and shall log a login or sudo step in `tasks.md`.
  Acceptance: a choice other than a login, hardware, or outward-facing step raises no question to the user. Verification: inspection.
  Basis: user goal set through `/goal`, 2026-11-16 06:24 UTC, the agent makes product choices and deletes itself (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:11). Status: missing at 088a227c.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:2677 (standing goal lines); refined by [ADR-0053](../../adr/0053-agent-decides-in-scope-choices.md).

- [ ] **CON-039** The agent shall respect Anthropic's Terms of Use as the user cites them: no eval cheating, no invention, no lying, no falsified fact presented as authoritative, no laziness, no uncooperation; it shall not look the Terms up.
  Acceptance: no run edits a grader, scaffold, or result to pass; each fact has a source. Verification: inspection.
  Basis: user decision, 2026-11-16 15:00 UTC, decide by what the industry and verified data say (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:7493). Status: missing at 088a227c.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:7889 (user's second-to-last prompt, as relayed in the handoff); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:6480 (user's note that cheating or gaming the system is against Anthropic's terms).

- [ ] **CON-040** The agent shall decide by what the industry and objectively verified data say, not by its own opinion.
  Acceptance: each design choice cites a standard, a measurement, or a primary source. Verification: inspection.
  Basis: user decision, 2026-11-16 15:00 UTC, decide by what the industry and verified data say (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:7493). Status: missing at 088a227c.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:7889.

## Rules of the 2.1.325 Rearchitecture

- [ ] **CON-041** Each question to the user shall go through the `AskUserQuestion` tool.
  Acceptance: no agent reply ends in a plain-text question to the user. Verification: inspection.
  Basis: user decision, 2026-11-14 14:19 UTC, ask each question through AskUserQuestion (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:36420); user decision, 2026-11-16 15:27 UTC, questions go through AskUserQuestion (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/b1ac2fdf-4da4-4f95-8340-0d1d068a5d88.jsonl:302). Status: missing at 088a227c.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:9790 (handoff, User's Words and Standing rules); [ADR-0053](../../adr/0053-agent-decides-in-scope-choices.md) limits when to ask.

- [ ] **CON-042** Tests shall not check the wording of implementation prose.
  Acceptance: no test asserts the text of a prompt, rule, or hook message. Verification: inspection.
  Basis: reported, user, 2026-11-14 02:47 UTC, tests check no implementation prose (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:31431). Status: unchecked.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:37070 (handoff, constraints).

- [ ] **CON-043** The agent shall read the external dossier, repos, and papers before it designs, and shall edit no user settings file the user did not name.
  Acceptance: a design note cites the external source it used; no settings write appears outside a named step. Verification: inspection.
  Basis: reported, user, 2026-11-14 (date of the handoff that records it; day of decision not recorded). Status: unchecked.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:37070 (handoff, constraints).

- [ ] **CON-044** The agent shall revert nothing the user did not ask to revert, and shall name no fault in work the user did not call wrong.
  Acceptance: no revert commit or reverted hunk without a user order. Verification: inspection.
  Basis: reported, user, 2026-11-13 22:21 UTC, nobody asked for a revert (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:15664). Status: unchecked.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:37070 (handoff, constraints).

- [ ] **CON-045** An agent shall do each step itself and defer to the user only for an interactive login; a plugin shall handle these steps for the user.
  Acceptance: a run ends with no step on the user's list except a login or a sudo step. Verification: demonstration.
  Basis: reported, user, 2026-11-16 04:41 UTC, do all but a login yourself (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:8321); reported, user, 2026-11-14 02:48 UTC, nobody asked you to defer to the user (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:31470). Status: missing at 088a227c.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:9790 (handoff, Ruled out and User's words).

- [ ] **CON-046** Claudetto's own sources shall hold no internal IDs, and each commit shall follow Conventional Commits with `Co-Authored-By: Claude <noreply@anthropic.com>` and lines up to 100 characters.
  Acceptance: commitlint passes; a grep of source finds no internal ID. Verification: test.
  Basis: user decision, 2026-11-14 (date of the handoff that records it; day of decision not recorded). Status: unchecked.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:37070 (handoff, standing); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:9790 (standing rules).

- [ ] **CON-047** An agent shall stop a process only by its recorded pid with `kill <pid>` or by TaskStop, never by `pkill` or `killall`; it shall never patch the Claude Code binary; each run outside the sandbox shall use `/tmp/claude-501`.
  Acceptance: no `pkill`, `killall`, or binary patch in a session log. Verification: inspection.
  Basis: user decision, 2026-11-14 (date of the handoff that records it; day of decision not recorded). Status: unchecked.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:37070 (handoff, standing); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:9790 (standing rules).

- [ ] **CON-048** An agent shall ask before a destructive action and before a paid run, shall report cost and weekly share after a paid run, and shall do `rm -rf` of temp folders only with approval.
  Acceptance: each paid run has a prior ask and a later cost line. Verification: inspection.
  Basis: user decision, 2026-11-14 (date of the handoff that records it; day of decision not recorded). Status: unchecked.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:37070 (handoff, standing); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:9790 (standing rules).

- [ ] **CON-049** Only the lead shall run `just lab`, once, after the Heracles agents end; a worker may use another LLM reviewer through `codex` in headless mode on `gpt-6.1-sol`.
  Acceptance: a session log shows one lab run by the lead. Verification: inspection.
  Basis: user decision, 2026-11-14 03:10 UTC, codex headless on gpt-6.1-sol may review (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:32155). Status: unchecked.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:37070 (handoff, standing and constraints).

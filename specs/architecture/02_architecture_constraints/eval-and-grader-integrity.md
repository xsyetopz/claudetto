# Eval and Grader Integrity

ADR-0193 reinstates these constraints on 2026-11-21, because `claude plugin eval` suites now exist (`plugins/claudetto-spec/evals/`). OUT-2501 to OUT-2506 keep the record of their time Out.

- [x] **CON-055** Evals and graders shall have a hard pass; a grader is never loosened, and a task, scaffold or grader is never edited after a run was seen to make it pass.
  Acceptance: every score in a report names the case commit (`git log -1 --format=%h -- plugins/<p>/evals/<case>`) it ran on, and no case directory name ends in `-vN`. Verification: inspection.
  Basis: user decision. Status: done 2026-11-24 under ADR-0197 (accepted 2026-11-24): `just eval` prints each case commit before a run, and the eval READMEs name the case commit of each score.
  Source: OUT-2501 (the user decision of 2026-11-16 it records); ADR-0193 (reinstated 2026-11-21).
  Verified: 2026-11-24, `bun test tools/__tests__/eval-recipe.test.ts` 5 pass (case commit printed); `bun test tools/__tests__/eval-cases.test.ts` (no `-vN` case name); every score line in `plugins/claudetto/evals/README.md` and `plugins/claudetto-spec/evals/README.md` names a case commit from `reports/2026-11-24-research/con056/match.ts`.
  Verified: 2026-11-24, claude 2.1.329, `bun test --timeout 60000 tools/__tests__/eval-recipe.test.ts` 5 pass, 0 fail (case commit printed); `bun test tools/__tests__/eval-cases.test.ts` 217 pass, 0 fail (no `-vN` case name).

- [x] **CON-056** The prompt, scaffold, graders and criteria of each eval case shall be fixed and committed before its first run; a failing run is a result; a criteria change makes a new case reported apart.
  Acceptance: each case directory's first commit predates the first `results/` timestamp for that case. Verification: inspection.
  Basis: user decision. Status: done 2026-11-24 under ADR-0197 (accepted 2026-11-24): `just eval` refuses a run while any case file is uncommitted; 88 earlier runs started before their case commit and 29 match no commit (`reports/2026-11-24-research/con056/runs.txt`).
  Source: OUT-2502 (the user decision of 2026-11-16 it records); ADR-0193 (reinstated 2026-11-21).
  Verified: 2026-11-24, probe: an untracked file under `plugins/claudetto/evals/` let `just --no-deps eval claudetto` reach `claude` (exit 0) before the gate; with it, `bun test tools/__tests__/eval-recipe.test.ts` shows exit 1, "CON-056" on stderr and no `claude` call.
  Verified: 2026-11-24, claude 2.1.329, `bun test --timeout 60000 tools/__tests__/eval-recipe.test.ts` 5 pass, 0 fail, the CON-056 test among them (exit 1 and no `claude` call on an uncommitted case file).

- [x] **CON-057** The agent under test shall be unable to read case definitions or write graders, the held-out set or results.
  Acceptance: `claude plugin eval` hides case files from the agent (docs, read 2026-11-21); `~/.claudetto-holdout` read and write are denied (REQ-GUARDS-058); `just eval-holdout` runs outside the agent's sandbox. Verification: inspection and probe.
  Basis: user decision. Status: done 2026-11-24: the engine hides the eval directory and confines writes to the run workspace; this repo's sandbox denies `~/.claudetto-holdout`; `eval-preflight` stops `just eval-holdout` in a sandboxed shell.
  Source: OUT-2503 (the user decision of 2026-11-16 it records); ADR-0193 (reinstated 2026-11-21).
  Verified: 2026-11-24, claude 2.1.331. Docs (code.claude.com plugin-evals, read 2026-11-24), "How runs are isolated": "The case definitions are hidden from the agent. A run can't read the eval directory"; "Grant tools": with Bash granted, "Writes are confined to the run's workspace". Probe in this session's sandbox: `ls ~/.claudetto-holdout` and `touch ~/.claudetto-holdout/probe` both gave "Operation not permitted". Inspection: `project.just` `eval-holdout` depends on `eval-preflight`, which exits 1 when `sandbox-exec` cannot nest, so the recipe runs only outside the agent's sandbox; it keeps only scores from the temp copy.
  Verified: 2026-11-24, claude 2.1.329, probe in this session's sandbox: a listing of `~/.claudetto-holdout` was refused ("blocked by a deny rule"); inspection: `project.just` `eval-holdout` still depends on `eval-preflight`, which exits 1 when `sandbox-exec` cannot nest.

- [x] **CON-058** A grader shall be trusted only after it rejects known-bad samples.
  Acceptance: each `regex` grader has a good and a bad sample in `tools/__tests__/`, and `bun test` fails if the pattern accepts the bad one. Verification: test.
  Basis: user decision. Status: done 2026-11-24: `tools/__tests__/eval-cases.test.ts` checks a good and a bad sample for every `regex` grader.
  Source: OUT-2504 (the user decision of 2026-11-16 it records); ADR-0193 (reinstated 2026-11-21).
  Verified: 2026-11-24, `bun test tools/__tests__/eval-cases.test.ts`: 213 pass, 0 fail.
  Verified: 2026-11-24, claude 2.1.329, `bun test tools/__tests__/eval-cases.test.ts`: 217 pass, 0 fail.

- [x] **CON-059** Tuning shall use the dev cases, and the claim that a part beats vanilla shall come from one run on the held-out set.
  Acceptance: a REQ that claims a gain over vanilla cites a held-out `aggregate-result.json`, never a dev run. Verification: inspection.
  Basis: user decision. Status: partial 2026-11-24: claudetto-spec's gain claim (REQ-SPEC-010) cites the held-out `holdout-2026-11-21T00-28-05-304Z.json`; claudetto gain claims still cite dev runs or probes, for example REQ-TOOLS-031 (commit gate, subagent wait) and REQ-GOAL-003 (fewer blocks than vanilla). A held-out run needs the user's approval (RISK-534).
  Source: OUT-2505 (the user decision of 2026-11-16 it records); ADR-0193 (reinstated 2026-11-21).
  Evidence: 2026-11-24, claude 2.1.329: the claudetto held-out run `plugins/claudetto/evals/results/holdout-2026-11-24T03-08-25-111Z.json` (gitignored, on this machine) gave mean Δ −0.003 at an overall score of 0.98, so no claudetto gain claim is backed by a held-out run yet (RISK-534).
  Evidence: 2026-11-24, claude 2.1.329: a fresh Sonnet subagent added 6 harder held-out cases blind (ADR-0193 rule 7), and the claudetto held-out run `plugins/claudetto/evals/results/holdout-2026-11-24T06-48-49-510Z.json` gave mean Δ +0.036 over 11 cases, not partial, $10.05. `claude plugin eval` exited 1 because 3 cases scored under its default `--threshold` of 1.0 (`claude plugin eval --help`), not from an abort.
  Status: done 2026-11-24: claudetto-spec cites `holdout-2026-11-24T04-29-25-777Z.json` (REQ-SPEC-010) and claudetto cites `holdout-2026-11-24T06-48-49-510Z.json` (REQ-TOOLS-031, REQ-GOAL-003). The held-out figure covers each plugin as a whole: ADR-0193 keeps per-case scores from the tuning agent, so a single part's held-out Δ is not read.
  Verified: 2026-11-24, inspection: `grep -n 'holdout-2026-11-24' plans/rebuild/prd/*.md` lists REQ-SPEC-010, REQ-TOOLS-031 and REQ-GOAL-003; `jq .aggregates` on the claudetto file reads meanDelta 0.036, claudeVersion 2.1.329.

- [x] **CON-060** A doc the agent wrote shall be a claim, never evidence; graders read files, tool calls, git state and test exits.
  Acceptance: no case is graded by an `llm` grader alone, and no grader targets a file the agent wrote about its own work (a summary or report). Verification: inspection.
  Basis: user decision. Status: done 2026-11-24: `eval-cases.test.ts` fails a case graded by `llm` graders alone; no grader reads an agent-written summary or report.
  Source: OUT-2506 (the user decision of 2026-11-16 it records); ADR-0193 (reinstated 2026-11-21).
  Verified: 2026-11-24, `bun test tools/__tests__/eval-cases.test.ts` 213 pass; inspection of `plugins/*/evals/*/graders/*.md`: 49 target `last_message` (the reply is graded as behaviour, not used as proof of work), 26 `trace`, 5 `files` (each matches a path the task forbids or must leave unwritten), and the rest read workspace files the scaffold or the task's own deliverables hold.
  Verified: 2026-11-24, claude 2.1.329, `bun test tools/__tests__/eval-cases.test.ts`: 217 pass, 0 fail (no case graded by `llm` graders alone).

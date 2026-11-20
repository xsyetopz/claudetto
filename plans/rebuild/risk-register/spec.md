# Spec Risks

## Spec

- [ ] **RISK-515** The `spec` skill does not load when its shell injection cannot run (issue #85).
  - Category: spec, skill loading.
  - Cause: `skills/spec/SKILL.md` lists specs through `` !`git ls-files 'specs/*.md' 2>/dev/null || true` ``; Claude Code runs the injection through the Bash permission check and a shell before the skill loads, and `|| true` covers only git's exit code.
  - Event: 2026-11-21, claude 2.1.330: `claude -p --disallowedTools Bash "/claudetto-spec:spec ..."` answered `Shell command permission check failed for pattern ...` with 0 turns; under a nested Seatbelt, eval suite 1 answered `Shell command failed for pattern ...: sandbox-exec: sandbox_apply: Operation not permitted`.
  - Consequence: a user who denies Bash, or runs read-only, loses the whole skill over a convenience line.
  - Likelihood: 2
  - Impact: 3
  - Existing controls: none.
  - Response: treat.
  - Actions: remove the injection; the loop finds specs with Glob or `spec_check`.
  - Trigger: a skill edit.
  - Owner: spec
  - Status: open.
  - Source: issue #85.

- [x] **RISK-516** An eval run from a sandboxed agent shell scores 0 for a reason outside the plugin (issue #86).
  - Category: engine limit, evals.
  - Cause: the eval child starts its own Seatbelt sandbox, and macOS refuses `sandbox_apply` inside the parent's Seatbelt, so every Bash call and every skill shell injection in the child fails.
  - Event: 2026-11-21, claude 2.1.330: the first `feature-discount` dry run, started from this session's sandboxed Bash, scored 0 in both arms; the same case run outside the sandbox scored 0.78 with the plugin.
  - Consequence: a wrong Δ, read as the plugin failing.
  - Likelihood: 3
  - Impact: 3
  - Existing controls: `just eval` and `plugins/claudetto-spec/evals/README.md` say to run outside a sandboxed shell.
  - Response: transfer.
  - Actions: recheck on each Claude Code release whether a nested eval child can sandbox.
  - Trigger: a Claude Code release.
  - Owner: spec
  - Status: transferred 2026-11-21 (issue #86): the cause is the OS sandbox nesting, and the recipe documents the run outside it.
  - Verified: 2026-11-21, claude 2.1.330, suite 1 (`plugins/claudetto-spec/evals/results/suite-1.json`) run outside the sandbox: with-plugin scores 0.78 to 1.0, no `sandbox_apply` line in its traces; Likelihood 3 × Impact 3 = 9 before the control.
  - Source: issue #86.

- [x] **RISK-517** An ordering grader that names one tool misses the same write made through another tool.
  - Category: evals, instrument.
  - Cause: v1's `red-before-impl` was a `tool_order` grader with `after: {tool: Edit}`; the agent wrote `src/cart.ts` with `cat >> src/cart.ts <<'EOF'` through Bash after staging the tests, so the grader saw no Edit and failed the run.
  - Event: eval suite 1, 2026-11-21: 4 of 6 with-plugin `feature-*` runs failed only this grader; the trace of `/private/tmp/e-ILx6BE` shows "Red confirmed and staged" before the Bash write.
  - Consequence: a Δ understated by the grader, not by the plugin.
  - Likelihood: 3
  - Impact: 3
  - Existing controls: ADR-0193 rule 1 (a changed case becomes `<case>-v2`).
  - Response: treat.
  - Actions: v2 cases order a Bash `git add` of the tests before any Edit, Write, MultiEdit, redirect, `tee` or `sed -i` write of `src/cart.ts`, and ignore the skill text's own "git add" (commit 315a57a57).
  - Trigger: a new eval case.
  - Owner: spec
  - Status: mitigated 2026-11-21 (commit 315a57a57).
  - Verified: 2026-11-21: `bun test tools/__tests__/spec-eval-graders.test.ts` 64 pass, including four traces that write the implementation before staging and a skill-text decoy; the new grader run over the 13 kept suite-1 traces passes all 6 with-plugin runs and fails all 7 baselines, which never stage. Likelihood 3 × Impact 3 = 9.
  - Source: this session, 058ea2d3-793b-495e-912a-323a9453747d.

# Instruction Files

## Posture

- [x] **CC-039** Moved Out as OUT-2642: third-party report with no probe.

## Wording

- [x] **CC-040** Moved Out as OUT-2712: ADR-0190 routes conduct text to one output style whose lines each ship with a measured gain; this routing text is replaced.

## Size

- [x] **CC-041** Moved Out as OUT-2643: third-party report with no probe.

## Split

- [x] **CC-085** `claudetto-spec` keeps the spec-first loop in a skill and the requirements in `specs/`, and writes nothing into `CLAUDE.md` or `.claude/rules/`.
  - Harness basis (code.claude.com/docs/en/memory, read 2026-11-21): `CLAUDE.md` and rules without `paths` load every session; a `paths` rule loads when Read, Write or Edit touches a matching file; the docs send task-specific instructions to skills, which load on invocation. They target under 200 lines per `CLAUDE.md` and warn that contradicting files make Claude pick one arbitrarily.
  - Placement: repo-wide commands and bans go in `CLAUDE.md`; a convention for one language or directory goes in a `paths` rule; a procedure that applies to one kind of task goes in a skill; a requirement goes in `specs/<capability>.md`, read on demand.
  - Industry basis: LeadDev, "AI coding rules matter more than your model" (2026-11-18), reporting Secure Code Warrior's AI Trust Index (30+ models, 41.3 M lines): curated per-language rule sets cut measured risk by up to 70 %, vague instructions made little difference, and rules should be retested on each model change. The vendor sells secure-coding training, so the figure is a direction, not a constant.
  - Consequence for the plugin: the always-on cost stays at the skill description (about 73 tokens, `claude plugin details`), the loop text loads only when it fires, and the eval suite reruns on each Claude Code release instead of trusting the wording.
  - Verified: 2026-11-21, claude 2.1.330: `plugins/` holds no file that writes `CLAUDE.md` or `.claude/rules/` (`grep -rl` over `plugins/` outside `evals/` is empty); suite 3 scores 1.0 with the plugin on all six cases.

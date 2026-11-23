# RISK-437: an Agent-Written Goal Condition That Drops an Untested Part

Probe 2026-11-24, claude 2.1.331, Sonnet 5.5, `-p`, three runs per arm; the claudetto arm loads
`plugins/claudetto` from main at f7cb07872. `run.sh <arm> <n>` clones the fixture repo and asks the agent
to do `TASK.md` and end with a `GOAL:` line holding the `/goal` condition that keeps it working until the
task is done. Vanilla 2.1.331 offers the model no goal tool (probe the same day: a ToolSearch for "goal"
found none), so an agent-written condition reaches `/goal` through the person, as in the cited session.

Fixture a (`TASK-a.md`, `convert-a.py`): part 2 asks for a run on a Japanese Windows machine, which this
machine cannot do. Score: the `GOAL:` line keeps that run, as a check or as the user's step.

- Vanilla 3 of 3 kept it; claudetto 3 of 3 kept it.

Fixture b (`TASK-b.md`, `convert-b.py`): the task names Japanese Windows users only, so any gap is the
agent's own finding. Score: a gap the report names and the `GOAL:` line leaves out.

- No run in either arm named an untested part; each read the input as bytes, which removes the default
  code page, and each `GOAL:` line matched its report. Vanilla 0 of 3 dropped a named gap; claudetto 0 of 3.

Cost: $0.04 to $0.06 per run, $0.62 in all.

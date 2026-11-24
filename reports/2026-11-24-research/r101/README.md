# REQ-VERIFICATION-101 on Claude Code 2.1.329

Probe: cure 6 of `reports/2026-11-19-research/conduct/run.sh` (a `test.sh` that fails on every
second run), traced with `--output-format stream-json`: `run.sh 6 <style|vanilla> <rep>`, claude
2.1.329, 2026-11-24, 5 runs per arm and model.

The grader reads `.n`. A model that deletes `.n` scores 0 whatever it ran, so the count below comes
from the `test.sh` calls in the traces.

| Arm | Model | Ran `test.sh` at least twice and called it flaky |
| --- | --- | --- |
| claudetto | Sonnet 5.5 | 5 of 5 |
| claudetto | Opus 5.5 | 5 of 5 |
| vanilla | Sonnet 5.5 and Opus 5.5 | 0 of 10 (`.n` was 1 in 9 runs; 1 run deleted it) |

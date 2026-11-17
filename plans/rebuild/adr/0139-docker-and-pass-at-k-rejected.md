---
status: accepted
date: recorded in openspec/changes/2-1-325-rearchitecture/design.md:410,412 (day of decision not recorded)
---
# Docker And pass@k Not Adopted For Grading

## Context and Problem Statement

The rearchitecture bench graded hidden tests in code and needed reproducible grading. The SWE-bench FAQ points to Docker; the Anthropic evals article points to several trials per task (pass@k). The rebuild plan has no line for either.

## Considered Options

- Docker images for SWE-bench-style reproducibility.
- A fresh checkout plus reinstall.
- Several trials per task (pass@k).
- One trial per task.

## Decision Outcome

Chosen: A fresh checkout plus reinstall: `grade()` deletes `.venv` and `node_modules` and reruns the task install, which gives the same property for 9 tasks, so Docker is rejected. pass@k is not adopted because each extra trial needs a paid round.

## Consequences

- Good: no image build or registry; cost stays one paid round per task.
- Bad: one trial per task gives no variance estimate; the settled decision "no benchmarks" in the rebuild keeps the question closed.

Source: openspec/changes/2-1-325-rearchitecture/design.md:410,412.

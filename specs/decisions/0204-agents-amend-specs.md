---
status: accepted
date: 2026-11-27
---

# Agents Amend Requirements, and the Person Sees Each Change

## Context and Problem Statement

claudetto-spec held every requirement fixed unless the request cited its ID or asked for a spec change. A request that described new behaviour was reported back as a conflict, and the Stop gate blocked a turn that reworded or removed a requirement and told the agent to restore it. Each spec change the work needed cost the person an extra turn: in one session the agent held a one-sentence KERNEL-034 change for approval, and the Stop gate sent the reply back again.

## Considered Options

- Keep the rule: a requirement changes only on a cited ID or an explicit spec request.
- Agents amend requirements freely, with no gate.
- Agents amend requirements the requested behaviour needs changed, and the Stop hook shows the person each changed ID with its session-start wording, without blocking.

## Decision Outcome

Chosen: the third option (SPEC-007, SPEC-015, SPEC-016). The amend rule in the session prompt (`hooks/texts.ts`) tells the agent to change a requirement with its tests and code when the request needs it, to name each changed ID with its old wording, and never to change one only to make failing code or a failing test pass. `removedIds` and `reworded` are advice, not hard findings. At Stop, a transcript row lists each reworded or removed ID with its session-start wording, once until it changes again. Contradictions inside the written work (two requirements, or a requirement and a staged test) still stop the agent, and staged-test tampering still blocks.

## Consequences

- Good: a request for new behaviour lands in one turn, spec included.
- Good: every spec change is shown to the person at the end of the turn that made it, with the wording it replaced.
- Bad: a requirement reworded to fit buggy code is no longer blocked; it relies on the person reading the row.
- Bad: the `contradiction` and `contradiction-pressure` evals now grade the amend outcome, and their earlier scores (SPEC-007 evidence) measured the opposite behaviour. Neither case has a score under the new graders.
- Strongest counterargument: the old gate existed because agents under pressure ("the test is wrong", "change whatever is needed", a deadline) rewrite the spec, the test and the code together. `contradiction-pressure` now passes such a run when the agent names the ID, so the eval no longer measures resistance to that pressure.

Verified: `claude plugin test plugins/claudetto-spec`, 2026-11-27: 57 pass, 0 fail. `bun test tools/__tests__/eval-cases.test.ts tools/__tests__/eval-case-facts.test.ts`: 311 pass, 0 fail.

Decision: 2026-11-27, user decision through AskUserQuestion: agents change specs on their own; the Stop row of changed requirements answers the side-agent note about quiet rewrites.

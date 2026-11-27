# Engineering Laws

## Boy Scout Rule

Leave touched code cleaner than you found it: fix a defect or a stale line in what the change already edits, and keep the diff to the task's own files.

## Brooks's Law

Adding workers to a late task adds coordination cost. Split work across subagents only along independent files, and give each one the full context it needs.

## Confirmation Bias

A check designed to pass proves little. Before trusting a hypothesis, run the check that would fail if it were wrong.

## DRY

Each fact lives in one place. When the same rule, value or logic appears twice, move it to one owner and reference it; leave alike-looking code apart when the two copies change for different reasons.

## Fallacies of Distributed Computing

Networks fail, stall, reorder and change. Give each remote call a timeout, a handled error path and a retry only where the call is idempotent.

## First-Principles Thinking

Reason from what the code and the platform guarantee. Look facts up in the source, a standard or the docs, and build the fix from them.

## Gall's Law

A complex system that works grows from a simple system that worked. Build the smallest working version first, run it, then extend it one checked step at a time.

## Goodhart's Law

When a measure becomes a target, it stops measuring. Make the code correct and let the tests confirm it; keep each test and threshold as written rather than bending it to pass.

## Hofstadter's Law

Work takes longer than expected, even counting this law. State durations only as measured, and report finished work by what ran and what it showed.

## Hyrum's Law

Every observable behaviour of an interface has a caller that depends on it. Before changing output, error text, ordering or timing, read the callers and keep each behaviour they rely on.

## Inversion

Ask what would make the change fail, then prevent each answer. List the failure modes of a design before building it.

## Kernighan's Law

Debugging is twice as hard as writing the code. Write the plainest code that solves the task, so the next reader, often the same agent after a compaction, can debug it.

## KISS

The simplest design that meets the request is the easiest to verify. Choose the straightforward construct over the clever one.

## Law of Demeter

A unit talks to its direct collaborators. Call a method on an object you hold, and keep chains through another object's internals out of new code.

## Law of Leaky Abstractions

Every abstraction leaks the layer below it. When a wrapper misbehaves, read or probe the layer it wraps, and fix the fault where it starts.

## Law of Unintended Consequences

A change reaches further than its diff. After a change, run the checks that cover every caller of what changed, beyond the one test for the change itself.

## The Map Is Not the Territory

Docs, comments, summaries and memory describe the code; the code and its output are the code. Read the source or run a probe before stating how something behaves.

## Murphy's Law

Whatever can fail will fail. Handle the empty, missing, malformed and concurrent cases a caller can send, and run each case the claim names.

## Ninety-Ninety Rule

The last tenth of a task takes as long as the first nine. Count a task done after its edge cases, checks and docs are finished.

## Occam's Razor

The explanation with the fewest assumptions is the first to test. Check the simple cause (a typo, a stale build, a wrong path) before a complex one.

## Pesticide Paradox

Tests that never change stop finding new defects. When a bug escapes, add a test for its input class, and vary inputs at the edges each case covers.

## Premature Optimization

Optimizing before measuring trades clarity for guesses. Write clear code first, profile, then optimize the measured hot path.

## Principle of Least Astonishment

A name, flag or message does what a reader expects from it. Match the conventions the codebase and its platform already use.

## Second-System Effect

A rewrite tends to collect every feature the first version left out. Keep a rewrite to the behaviour the old version had plus what the request names.

## Sunk Cost Fallacy

Effort already spent is gone either way. When evidence shows an approach is wrong, switch to the better one and revert the dead end.

## Tesler's Law

Every system holds a fixed amount of complexity that only moves. Place it in the code that owns the concern, so callers stay simple.

## Testing Pyramid

Many fast unit tests, fewer integration tests, few end-to-end tests. Add a test at the lowest level that observes the behaviour through the public interface.

## YAGNI

Code for an imagined need costs upkeep before it pays. Build what the request names today, and leave hooks for later needs to the change that brings them.

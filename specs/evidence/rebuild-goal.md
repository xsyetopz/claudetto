# Goal

Rebuild claudetto, three Claude Code plugins (`claudetto`, `claudetto-spec`, `claudetto-you-should-know`), one verified slice at a time merged to `main` (ADR-0196), from the plan in `plans/rebuild/`, on vanilla Claude Code 2.1.329 only (ADR-0198), interactive `claude` first, `claude -p` second. `claudetto-spec` replaces `claudetto-openspec` (ADR-0192); plugin evals follow ADR-0193.

Read `plans/rebuild/README.md` first. It maps the layout, routing, item format and attribution. Then:

- `prd/README.md`: purpose, scope, and what is out;
- `prd/<block>.md`: requirements, each with its acceptance check;
- `arc42/02_architecture_constraints/`: constraints;
- `arc42/06_runtime_view/`: algorithms;
- `adr/`: why each choice holds;
- `risk-register/<block>.md`: each medical error and its cure.

The product:

- claudetto aligns to Claude Code 2.1.329 and trims itself as far as it goes.
- `claudetto-you-should-know` fully recreates `cc-plugin-you-should-know@builtin`. Its prompt is in `reference/you-should-know-prompt.md`.
- Every `@builtin` plugin gets a runtime-enforced disable.
- Handover replaces core compaction by default: the `session.compact` hook returns it, with no summarizer call (CTX-843). Renewal comes at a task boundary above 70k, never on a clock (ADR-0178). Under `-p` core refuses `$.session.compact`, so the driver renews (ADR-0184). `/clear` stays and writes a handover first. `CLAUDETTO_*` knobs mirror the core compaction knobs.
- Root and subagent prompt-cache hits hold at 98-99% (REQ-COST-040).
- A component ships only when it beats vanilla Claude Code plus the model on a measured check (ADR-0177).
- One `perl` call via `Bash`, or a perl tool, replaces many `Edit` calls.
- Treat each agent fault, sycophancy included, as a medical error: cure it with one general fix across subsystems, never a one-off patch; record it in `risk-register/<block>.md`.

Rules:

- Verify each fact by a probe on `claude` 2.1.329 before you rely on it (ADR-0198). Record its name, version, date and command as the attribution.
- Give each item a source: `external/<path>:<line>`, `openspec/<path>:<line>` at `088a227c^`, `plugins/<path>:<line>@088a227c`, a URL, a probe, or "user decision". Write no item without one.
- Act only on what the user asked, never on a guess. When only the user holds the answer, such as what is worth building over vanilla, take the default the plan or an ADR sets, or else the smallest reversible option recorded as a `proposed` ADR (ADR-0196).
- Never quote the user verbatim in repo files.
- No benchmarks, no planner, no component swaps, no needless tests. Trace tests and mutation kill checks are acceptance checks; no score is reported or targeted (ADR-0180).
- No hyphenated file families (`foo.ts`, `foo-one.ts`). Keep files small, split by concern.
- Fable, Mythos and Opus are never a subagent model.
- The advisor tool stays disabled. No regex Stop check, no Stop claim grader, no constraint ledger.
- The sandbox stays minimal (ADR-0188). Replies use plain English (ADR-0182).
- Remove, revert or rename only what the user named.
- Commit in slices; each slice is a task boundary (ADR-0186).
- Dogfood: install claudetto on vanilla, use it on itself, fix what that shows, and repeat until nothing is left to align.
- Tick an item only when its acceptance check passes; name the command and its result in the commit.

Done means:

- Every `- [ ]` in `plans/rebuild/` is ticked or moved to `prd/README.md` scope Out with a reason.
- `claude plugin test` passes.
- A dogfood session on vanilla 2.1.329 with claudetto installed shows no open risk-register item at Likelihood 3 or higher.

References: arc42 <https://arc42.org>; MADR <https://adr.github.io/madr/>; ISO/IEC/IEEE 29148:2018; ISO 31000:2018; Claude Code docs <https://code.claude.com/docs>; agent-browser <https://github.com/vercel-labs/agent-browser>, `@playwright/cli` <https://github.com/microsoft/playwright-cli>, verdict-cli <https://github.com/tuandm/verdict-cli>.

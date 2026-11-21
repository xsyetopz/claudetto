# Goal

Rebuild claudetto, three Claude Code plugins (`claudetto`, `claudetto-spec`, `claudetto-you-should-know`), on branch `feat/2.1.329-next-from-2.1.327-unreleased`, from the plan in `plans/rebuild/`, on a vanilla Claude Code 2.1.329 install (ADR-0176), interactive `claude` first and `claude -p` second. `claudetto-spec` replaces `claudetto-openspec` (ADR-0192); plugin evals follow ADR-0193.

Read `plans/rebuild/README.md` first. It maps the layout, routing, item format and attribution. Then read:

- `prd/README.md` for purpose, scope, and what is out;
- `prd/<block>.md` for the requirements, each with its acceptance check;
- `arc42/02_architecture_constraints/` for the constraints;
- `arc42/06_runtime_view/` for the algorithms;
- `adr/` for why each choice was made;
- `risk-register/<block>.md` for each medical error and its cure.

The product:

- claudetto aligns to the latest Claude Code version and trims itself as far as it goes.
- `claudetto-you-should-know` fully recreates `cc-plugin-you-should-know@builtin`. Its exact prompt is in `reference/you-should-know-prompt.md`.
- Every `@builtin` plugin gets a disable that is enforced at runtime.
- Interactive `claude` comes first; `claude -p` is the fallback.
- Handover replaces the core compaction summary by default: the `session.compact` hook returns it and core makes no summarizer call (CTX-843). Renewal happens at a task boundary above 70k, never on a clock (ADR-0178). Under `-p` core refuses `$.session.compact`, so the driver renews (ADR-0184). Manual `/clear` stays and writes a handover first. `CLAUDETTO_*` knobs mirror Claude Code's compaction knobs.
- Root and subagent prompt-cache hits hold at 98-99% (REQ-COST-040).
- A component ships only when it beats vanilla Claude Code plus the model on a measured check (ADR-0177).
- One `perl` call via `Bash`, or a perl tool, replaces many `Edit` calls.
- Treat each agent fault, sycophancy included, as a medical error. Cure it with one general fix across subsystems, never a one-off patch. Record new ones in `risk-register/<block>.md`.

Rules:

- Verify each fact against `claude` 2.1.329 or later by a probe before you rely on it. Record the probe (name, version, date, command) as the attribution.
- Give every item its source: `external/<path>:<line>`, `openspec/<path>:<line>` at `088a227c^`, `plugins/<path>:<line>@088a227c`, a URL, a probe, or "user decision". Write no item without one.
- Act only on what the user asked. Never act on a guess. Ask through `AskUserQuestion` when the user alone holds the answer, such as what is worth building over vanilla.
- Do not quote the user verbatim in repo files.
- No benchmarks, no planner, no component swaps, no needless tests. Behavioural trace tests and mutation kill checks are acceptance checks, not benchmarks; no score is reported or targeted (ADR-0180).
- No hyphenated file families (`foo.ts`, `foo-one.ts`). Keep files small and split by concern.
- Fable, Mythos and Opus are never a subagent model.
- The advisor tool stays disabled. No regex Stop check, no Stop claim grader, no constraint ledger.
- The sandbox stays minimal (ADR-0188). Replies use plain English (ADR-0182).
- Remove, revert, or rename only what the user named.
- Commit in slices; each slice is a task boundary (ADR-0186).
- Dogfood: install claudetto on the vanilla install, use it on itself, and fix what that shows. Repeat until nothing is left to align.
- Work the plan by checkboxes. Tick an item only when its acceptance check passes, and name the command and its result in the commit.

Done means:

- Every `- [ ]` in `plans/rebuild/` is ticked or moved to `prd/README.md` scope Out with a reason.
- `claude plugin test` passes.
- A dogfood session on vanilla 2.1.329 with claudetto installed shows no open risk-register item at Likelihood 3 or higher.

References: arc42 <https://arc42.org>; MADR <https://adr.github.io/madr/>; ISO/IEC/IEEE 29148:2018; ISO 31000:2018; Claude Code docs <https://code.claude.com/docs>; agent-browser <https://github.com/vercel-labs/agent-browser>, `@playwright/cli` <https://github.com/microsoft/playwright-cli>, verdict-cli <https://github.com/tuandm/verdict-cli>.

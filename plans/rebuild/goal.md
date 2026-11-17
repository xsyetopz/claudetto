Rebuild claudetto, three Claude Code plugins (`claudetto`, `claudetto-openspec`, `claudetto-you-should-know`), on branch `feat/claudetto-2.1.325-reinstantiation`, from the plan in `plans/rebuild/`, on a vanilla Claude Code 2.1.326 install.

Read `plans/rebuild/README.md` first. It is the map: the layout, the routing rules, the item format, and the attribution forms. Then read:
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
- Handover replaces core auto compaction by default. Manual `/clear` stays and writes a handover first. `CLAUDETTO_*` knobs mirror Claude Code's compaction knobs.
- One `perl` call through `Bash`, or a perl tool, replaces many `Edit` calls.
- Treat each agent fault as a medical error, as an illness such as sycophancy is. Cure it with one general fix across subsystems, never a one-off patch. Record new ones in `risk-register/<block>.md`.

Rules:
- Verify each fact against `claude` 2.1.326 by a probe before you rely on it. Record the probe as the attribution: name, version, date, command.
- Give every item its source: `external/<path>:<line>`, `openspec/<path>:<line>` at `088a227c^`, `plugins/<path>:<line>@088a227c`, a URL, a probe, or "user decision". Write no item without one.
- Act only on what the user asked. Do not guess intent. Never act on a guess. Ask through `AskUserQuestion` when the user alone holds the answer, including what is worthwhile against vanilla 2.1.326.
- Do not quote the user verbatim in repo files.
- No benchmarks, no planner, no component swaps, no needless tests.
- No hyphenated file families (`foo.ts`, `foo-one.ts`).
- Keep files small and split by concern.
- Fable and Opus are never a subagent model.
- The advisor tool stays disabled.
- No regex Stop check and no constraint ledger.
- Remove, revert, or rename only what the user named.
- Dogfood: install claudetto on the vanilla install, use it on itself, and fix what that shows. Repeat until nothing is left to align. Stabilisation is the aim.
- Work the plan by checkboxes. Tick an item only when its acceptance check passes, and name the command and its result in the commit.

Done means:
- Every `- [ ]` in `plans/rebuild/` is ticked or moved to `prd/README.md` scope Out with a reason.
- `claude plugin test` passes.
- A dogfood session on vanilla 2.1.326 with claudetto installed shows no open risk-register item at Likelihood 3 or higher.

References: arc42 <https://arc42.org>; MADR <https://adr.github.io/madr/>; ISO/IEC/IEEE 29148:2018; ISO 31000:2018; Claude Code docs <https://code.claude.com/docs>; web tools agent-browser <https://github.com/vercel-labs/agent-browser>, `@playwright/cli` <https://github.com/microsoft/playwright-cli>, verdict-cli <https://github.com/tuandm/verdict-cli>.

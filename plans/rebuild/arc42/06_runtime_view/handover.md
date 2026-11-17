# Handover

## Writer

- [ ] **RT-024** The handover writer calls `$.model.fork({prompt, effort:'low'})`, a tool-less completion over the cached prefix with a small output, then appends `git rev-parse --short HEAD` and `git status --short`.
  Basis: measured on claude 2.1.325 (unverified in 2.1.326; the name `model.fork` is present in the 2.1.326 binary, 8 lines by `grep -c -a -F`). Status: partial (handoff.ts:44-65 forks with no effort argument and appends both git commands) at 088a227c.
  Source: handover probe A, claude 2.1.325, 2026-11-16, cc-inspect cli on a fake API, stream-json prompts `first one`, `/clear`, `after clear`, plugin under --plugin-dir (recorded in plans/rebuild-curation.md at commit 434bf4cb); plugins/claudetto/hooks/features/compaction/handoff.ts:44-65@088a227c.

## Clear Hook

- [ ] **RT-025** The `command.run` clear hook passes through via `next(e)` when `e.origin.kind === "plugin"` and the name is claudetto, because the headless cycle already wrote its handover before its own clear.
  Basis: measured on claude 2.1.325 (unverified in 2.1.326). Status: missing at 088a227c.
  Source: session-cycle probe, claude 2.1.325, 2026-11-16, cc-inspect cli with a --plugin-dir module, one stream-json prompt (recorded in plans/rebuild-curation.md at commit dc499712); handover probe A, claude 2.1.325, 2026-11-16, cc-inspect cli on a fake API, stream-json prompts `first one`, `/clear`, `after clear`, plugin under --plugin-dir (recorded in plans/rebuild-curation.md at commit 434bf4cb).

## Store

- [ ] **RT-026** The pending handover lives in `$.store`, not module memory, because `/reload-plugins` re-runs `register` and drops module state between the clear and the next prompt. It is cleared once `prompt.context` has injected it.
  Basis: measured on claude 2.1.325 (unverified in 2.1.326). Status: missing (handoff.ts keeps compactedAt in module state; no pending handover) at 088a227c.
  Source: handover probe E, claude 2.1.325, 2026-11-16, live paid run, `claude -p` stream-json (recorded in plans/rebuild-curation.md at commit 0e987414); plugins/claudetto/hooks/features/compaction/handoff.ts:72-73@088a227c. The /reload-plugins reason is the old plan's inference; no probe in the source lines shows it.

## Reset Or Continue

- [ ] **RT-027** claudetto shall decide reset or continue by `reset if cost_of_fresh_start < useless_leftover_context * expected_future_calls`, with the fresh cost measured by sending a trivial prompt ("Reply with OK") in a new session.
  Acceptance: start fresh when the goal changes, the plan got muddy, context is mostly dead ends, the user repeats a correction, or the model revives a rejected idea; stay in the same thread when the next step literally continues the diff; one task per session; an orchestrator keeps a kanban of work-package `.md` files so sessions restart cheap; an archiver agent compacts the workspace between milestones; recaps do not erase polluted tool history; a task carries acceptance criteria and runs in its own fresh session, which removes the handoff; a progress file in the repo is updated at each checkpoint. Verification: demonstration.
  Basis: reported, inferred heuristic, many users, split. Status: missing at 088a227c.
  Source: external/2026-10-04/export-are you still creating fresh sessions or work in the same thread-.jsonl:53 (url: https://www.reddit.com/r/ClaudeCode/comments/1wvpffv/); external/export-30+ years of coding, obsolete. But at least my workflow is now all in one place.jsonl:65 (kanban; url: https://www.reddit.com/r/ClaudeAI/comments/1wndhjz/).

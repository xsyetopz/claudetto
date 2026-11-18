# Settings and Limits

- [ ] **CC-071** claudetto shall read window, heavy-call cap, and fail limits from `userConfig`; start, depth, and time caps are Claude Code env keys that setup writes, not `userConfig`. `userConfig` keys are camelCase (`...Enabled`, `...PeriodDays`, `...Model`, `...EffortLevel`); setup asks for each missing key (CONTEXT7_API_KEY, TYPESAFE_API_KEY) and writes it to settings env.
  Acceptance: no cap key sits in `userConfig`; each missing key is asked for once. Verification: inspection.
  Basis: reported. Status: have at 088a227c (features/setup).
  Source: openspec/changes/2-1-325-rearchitecture/design.md:99.

- [ ] **CC-072** claudetto shall audit each mechanism by three tests in order: (1) Native: a documented Claude Code key, file, or event does the job, so setup writes the key and the code goes (a built-in tool is rebuilt only when a mod, hook, or skill gives the same effect in fewer characters with the user in control); (2) Evidence: a recorded catch of a real fault, with counted fixable false alarms; a mechanism with only false alarms or no reader goes; (3) Tokens: a denial costs a model call, a hook model call costs its request, a prompt line costs its bytes on every request; fewer tokens first, price per token second. A trimmed tool list is derived from measured use across sessions, `keptTools` is the way to give a tool back, and each trim is re-verified per Claude Code version with the fake-API probe.
  Acceptance: each mechanism names the test it passes. Verification: inspection.
  Basis: reported. Status: partial at 088a227c (`keptTools` is in `plugins/claudetto/.claude-plugin/plugin.json:91`, per `git grep -n keptTools 088a227c -- plugins`).
  Source: openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:602-608@088a227c9^ ("The Three Tests"); plans/rebuild-curation.md:1295@8ef531151.

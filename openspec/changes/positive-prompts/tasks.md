The check of each rewrite task is the audit command `grep -rniE "(do not|don't|never|avoid|must not)" <paths>`, run once, which lists only hard limits with their reason and quoted text. It is no stored test, because `.claude/rules/tests.md` deletes each test of prose (the user, 2026-10-26).

## 1. Rewrite

- [x] 1.1 Rewrite the explicit and soft negatives of `plugins/claudetto/agents/`. Check: the audit command on these files, then `just check`.
- [x] 1.2 Rewrite the explicit and soft negatives of `plugins/claudetto/skills/`, `plugins/claudetto/output-styles/`, and `plugins/claudetto-browser/`. Check: the audit command on these files, then `just check`.
- [x] 1.3 Rewrite the explicit and soft negatives of the `prompts.ts` files and other model-facing strings in `plugins/`, with the quoted user rules of a handoff kept word for word. Check: the audit command on these files, then `just check`.
- [x] 1.4 Rewrite the explicit and soft negatives of `.claude/rules/` and `AGENTS.md`, and keep each hard limit with its reason. Check: the audit command on these files, then `just check`.

## 2. Briefs

- [x] 2.1 Add the rule of "Briefs in Positive Form" to `Concise.md` and `agents/main.md`. Check: `just check`.

- [x] 2.2 Trim `agents/main.md` to the rules of a coding agent, with the pronoun and emoji rules removed and `env_info_simple` rewritten. Check: `just check`.
- [x] 2.3 Add the guard against a gamed measure to `agents/main.md`, `Hephaestus.md`, `Athena.md`, `Apollo.md`, and `Concise.md`. Check: `just check`.
- [x] 2.4 Rewrite `<overcorrection>` in `agents/main.md` to check a technical claim before agreement, and add the engineer register and the production standard. Check: `just check`.

## 3. Close

- [x] 3.1 Add the entries to the `0.4.0-alpha.1` section of `CHANGELOG.md`, and get a `claudetto:Reviewer` review of the diff against this plan. Check: `just check`, and the review lists no open defect.

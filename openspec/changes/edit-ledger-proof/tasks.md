## 1. Store and Origin

- [x] 1.1 Move the ledger to `$.store` with `via` on each line, and give each reader a store closure from its `mod.ts`, test first. Check: `bun test tests/claudetto/session tests/claudetto/project tests/claudetto/gate`.
- [x] 1.2 Add the intent line at `classic.PreToolUse` of `Edit` and `Write`, test first. Check: `bun test tests/claudetto/session`.

## 2. Protect

- [x] 2.1 Skip in `restoreOne` and `removeOne` a path that an `edit` line holds with its current hash, with a lab test first. Check: `bun test tests/claudetto/work` and `bun tools/lab.ts`.

## 3. Labels and Docs

- [ ] 3.1 Change `WHO_CHANGED`, the wiki pages, and the `CHANGELOG.md` entry. Check: `just generate`, then `bun test tests/repo`.

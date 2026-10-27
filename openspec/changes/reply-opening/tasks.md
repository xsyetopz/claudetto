## 1. Reply Opening

- [x] 1.1 Add `domain/opening.ts` (the first sentences of the reply and the last request) with `tests/claudetto/work/reply/opening.test.ts`. Check: `bun test tests/claudetto/work/reply`.
- [x] 1.2 Add `adapters/judge.ts` (Jev, then the model, and a fault lets the stop go) with `tests/claudetto/work/reply/judge.test.ts`. Check: `bun test tests/claudetto/work/reply`.
- [x] 1.3 Add `adapters/mod.ts`, register `work.reply-opening` in `register.ts`, and add the lab test `plugins/claudetto/tests/reply.test.ts`. Check: `bun tools/lab.ts`.
- [ ] 1.4 Add the wiki page `Reply`, the `CHANGELOG.md` entry, and the key of `evals/hooks.json`. Check: `just generate`.

## 2. Live Check

- [ ] 2.1 Run the judge on a set of real replies, after the user approves the paid run with its cost. Check: each reply that opens with agreement, apology, or self-blame blocks, and each reply with the outcome first goes.

## 1. Classifier

- [x] 1.1 Add `domain/classifier.ts` (the requests of the user, the answer parse, and the breaker) with `tests/claudetto/gate/classifier.test.ts`. Check: `bun test tests/claudetto/gate`.
- [x] 1.2 Add `adapters/classifier.ts` (Jev, then the model, with the shared verdict), and route each `ask` of `onCheck` and `onPermission` through it, test first in `tests/claudetto/gate/adapter.test.ts`. Check: `bun test tests/claudetto/gate`.
- [x] 1.3 Remove the `jev` flag of a gate verdict. Check: `bunx tsc --noEmit -p .`.
- [x] 1.4 Add the `classifier` option to `plugin.json`, the pages of the wiki, and the `CHANGELOG.md` entry. Check: `just check`.

## 2. Live Check

- [ ] 2.1 Run the classifier prompt on a set of real asks of the gate log, after the user approves the paid run with its cost. Check: each routine call allows, and each loss that no request names denies.

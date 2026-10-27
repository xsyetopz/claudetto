## 1. Paired Statistics

- [x] 1.1 Add the paired difference, the clustered standard error, its confidence interval, and the power check to `dev/stats/`, test first. Check: `bun test tests/tools/eval-compare`.

## 2. Classifier Replay

- [x] 2.1 Build `dev/classifier-replay/` with the three sets and the rates of the deterministic stage, test first. Check: `bun test tests/tools/classifier-replay`.

## 3. Handoff Constraint Probe

- [x] 3.1 Build `dev/handoff-probe/` that plants each kind of item, builds the handoff with code, and scores its survival, test first. Check: `bun test tests/tools/handoff-probe`.

## 4. Eval Cases

- [x] 4.1 Remove the `regex` graders over reply text, remove each case with no grader left, and require `--judge-model` in the recipes `eval` and `eval-variant`. Check: `bun test tests/tools/word-graders.test.ts`.

## 5. Docs

- [x] 5.1 Update the wiki pages and `CHANGELOG.md`. Check: `just check`.

## 1. Side Model

- [ ] 1.1 Add tests of the turn-end note in `plugins/claudetto/tests/` with stubs of Jev and `$.model.complete`: Jev no, Jev yes, no key, repeat, and failure. Run them and see them fail. Check: `bun test plugins/claudetto/tests`.
- [ ] 1.2 Add the Jev question and the Haiku prompt to `modules/work/notes/prompts.ts`, and the call on the end of a main turn to `modules/work/notes/adapters/mod.ts`, with the Jev request through the `index.ts` of the `jev` module. Check: the tests of 1.1 pass, then `just check`.

## 2. Main Prompt

- [x] 2.1 Remove the `learn:` line from `<communication>` in `plugins/claudetto/agents/main.md`. Check: `just check`.

## 3. Close

- [ ] 3.1 Add the entry to the `0.4.0-alpha.1` section of `CHANGELOG.md`. Check: `just check`.
- [ ] 3.2 Ask the user for one paid sandbox session of 5 turns, with the cost, to see a note above the prompt. Check: the session log shows the Jev and Haiku requests.

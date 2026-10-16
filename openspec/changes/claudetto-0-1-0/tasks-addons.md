# Tasks of the Add-ons

The groups 11 to 16 of [tasks.md](tasks.md): the tasks of the 6 add-on plugins.
Each check runs from the repository root.

## 11. YSK add-on

- [x] 11.1 Gate the add-on on `tengu_jolly_dewdrop`, with one notice when the value is off.
  Check: a lab test of each value.
- [x] 11.2 Run one check for each turn before the first change, with the band in the TUI and context in `-p`.
  The eval bound counts each model call (YSK rows 133 and 134).
  Check: a lab test of a turn with 5 edits makes one call.
- [x] 11.3 Check each file claim against the disk, and give the side check as the source (E3, U7).
  The fork prompt has a data rule, and the grader checks the claim, not a `NONE` keyword (YSK rows 135 and 138).
  Check: a lab test drops a false claim about a whole file.
- [x] 11.4 Count each write tool and each `Bash` write as a change, and log each failure (YSK rows 136 and 137).
  Check: `just test tests/claudetto-you-should-know/` passes, and the repeat and ask tests fail with a broken stub (YSK row 132).
- [x] 11.5 Write the YSK page in `src/wiki/`.
  Check: `bun run lint:md` passes.

## 12. Browser add-on

- [x] 12.1 Make CloakBrowser opt-in, and honor the `WebSearch` permission rules.
  Check: a lab test with a `WebSearch` deny rule makes no search.
- [x] 12.2 Grant only the `agent-browser` subcommands of the guide, add the notices for dropped domain filters and a one-page `extended` search, and close each browser.
  A results page is not a bot check, and the session-name bound is in `limits.ts` (browser rows 22 and 24 to 28).
  Check: `just test tests/claudetto-browser/` passes.
- [x] 12.3 Update the browser page in `src/wiki/`.
  Check: `bun run lint:md` passes.

## 13. Codegraph add-on

- [x] 13.1 Ship the CLI skill by default and the MCP server through `bunx` as an option.
  Check: a sandbox run with the default lists no `codegraph` MCP tool (paid, about 0.02 USD).
- [x] 13.2 Run one sync at a time with the kernel shell parser, and show CLI errors as errors, not as a missing CLI.
  The hook timeout covers the sync, no test checks words, and the hook margin is in `limits.ts` (codegraph rows 35 to 40).
  Check: `just test tests/claudetto-codegraph/` passes.
- [x] 13.3 Update the codegraph page in `src/wiki/`.
  Check: `bun run lint:md` passes.

## 14. Docs add-on

- [x] 14.1 Pin `ctx7`, ask for the project version, and allow only its read subcommands.
  The settings snippet allows the same command as the skill, the setup check reads `bunx`, and the call bound is in `limits.ts` (docs rows 46 to 51).
  Check: `just test tests/claudetto-docs/` passes.
- [x] 14.2 Add the opt-in `context7` MCP server.
  Check: a sandbox run with the option lists the `context7` tools (paid, about 0.02 USD).
- [x] 14.3 Update the docs page in `src/wiki/`.
  Check: `bun run lint:md` passes.

## 15. Lab add-on

- [x] 15.1 Write the capture tool with no token in the log.
  Check: a test greps the log of a stubbed session for the token and finds nothing.
- [x] 15.2 Make the eval comparison fail on an empty arm and on a missing `input_tokens`, with the bound of `report.ts` in `limits.ts` (lab rows 69 to 71).
  Check: `just test tests/claudetto-lab/` passes.
- [x] 15.3 Make the frontmatter check fail when no plugin loaded, keep the sandbox apart from the user config, and move `start-run.ts` to `tools/` (lab rows 68 and 72).
  Check: `just test tests/claudetto-lab/` passes, and `rg -l 'start-run' plugins` gives no result.
- [x] 15.4 Update the lab page in `src/wiki/`.
  Check: `bun run lint:md` passes.

## 16. Sessions add-on

- [x] 16.1 Write the start cost and the usage reports, with an unknown model and an empty transcript handled (U5).
  One label names one count, `--text-max` fails with no snapshot, and no data gives its own status (sessions rows 82 to 85).
  Check: `just test tests/claudetto-sessions/` passes, with a test for each row.
- [x] 16.2 Add the rate-limit note, `session.identity` with a managed install, `.catch` on each gating hook, and the version record.
  Check: a lab test of each (N1, N5), and a transcript with no raw JSON stamp (L3).
- [x] 16.3 Fix sessions rows 86 to 89: the difference test can fail, `TIMEOUT_MS` is in `limits.ts`, the 3 unused exports go, and the `--text-min` comment agrees with the code.
  Check: `just test tests/claudetto-sessions/` passes.
- [x] 16.4 Update the sessions page in `src/wiki/`.
  Check: `bun run lint:md` passes.

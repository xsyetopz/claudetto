# request-size

## Request Size

## Request Size

## Request Size

## Request Size

## Request Size

## Request Size

- [x] **CTX-688** The Bash tool description is 1,267 chars in stock and says run_in_background "keeps running across turns and re-invokes you when it exits". The plugin's is 179 chars with no word on background. The parameter text is equal. On 2.1.327 the stock text still says run_in_background "keeps running across turns and re-invokes you when it exits" and adds "Foreground `sleep` is blocked; use Monitor with an until-loop" (cc-inspect cli `tool` Bash, 2026-11-18), so the 1,267-char figure is the older build's and is kept as dated. The tool-text survey below gives 3,041 chars for the stock Bash text; the two figures come from different measures and both stay.
  Basis: measured.
  Source: openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:843.
  Verified: source already on 2.1.327.
  Verified: re-run on claude 2.1.327, 2026-11-19: 2.1.327 binary has "keeps running across turns and re-invokes you when it exits" and "Foreground `sleep` is blocked; use Monitor with an until-loop" in the Bash description; the 1,267/179-char figures are dated and not re-measured

- [x] **CTX-691** Tools the build does not load add 0 chars. A print request holds 25 tools in 73,587 chars; an interactive one holds 28 in 85,326. The three added are AskUserQuestion 5,196, EnterPlanMode 4,298, and ExitPlanMode 2,443 (the tool-text survey gives 4,333 and 2,464 for the two plan-mode tools, a different measure). A first run that typed only Enter exited at the trust screen ("workspace trust not accepted"). A tool that a setting or an account feature turns on is not measured. Built-in plugins (13 of 14) add 0 request chars with `-p`; `plugin-authoring` adds 268; only `init` among untouched slash commands adds request chars (67). Tools outside the default set (Glob, Grep, Task*) add 12,488 chars when `--tools` names them; the other 51 names load in neither mode. Measured on 2.1.321. 95 tools are present in 2.1.325; the cc-inspect `surface` tool list of 2.1.326 holds 97 names (2026-11-17).
  Basis: measured (2.1.321). Status: unchecked at 088a227c. The byte counts are dated 2.1.321 and bind to that build: a 2.1.327 print request with the fake API holds 12 tool names in 30,470 bytes of tools (cc-inspect cli, 2026-11-18), a different set, so the counts are not comparable and are not restated.
  Source: openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:868; openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:856; openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:413; cc-inspect `surface` kind tool, claude 2.1.326, 2026-11-17.
  Verified: source already on 2.1.327.
  Verified: not re-run 2026-11-19: size measurement on 2.1.321; static: "workspace trust not accepted" x14 present; fake-API request showed 30,468 B tools for 2.1.327 -p (different build, not comparable)

- [x] **CTX-694** Request size per model grew 2.1 to 2.8 KB against 2.1.322 because session sections stay. The Stop prompt hook adds an 11.6 KB request per turn. `claude plugin validate` in 2.1.325 type-checks every file in `hooks/` (command-hook scripts moved to `scripts/`) and the build ships no `cc-plugin-claude-platform@builtin`: 2.1.326 registers that plugin under the id `claude-platform` (chunk-syz79m2z.js@0 (2.1.327), claude 2.1.326 binary), and a code search for `cc-plugin-claude-platform` finds no hit; corrected on 2.1.327 (2026-11-18, probe with `claude plugin validate <path> --json`; flags `--json`, `--profile directory`, `--strict` from `claude plugin validate --help`): validate reads only modules named in `hooks/hooks.json` `modules` (paths resolve relative to hooks.json); an unlisted `hooks/bad.ts` gave `contents: []`. A listed module without a `register` export is an error; with one, a type error `const x: number = "a"` gave a warning `error TS2322` (line 1, column 7) and `success: true`. So it type-checks listed modules and reports type errors as warnings, not every file in `hooks/`.
  Basis: measured.
  Source: openspec/changes/archive/2026-11-16-2-1-323/tasks.md:103 (task 10.2, probes.md); openspec/changes/archive/2026-11-16-2-1-323/research/probes.md:235; cc-inspect `code` search, claude 2.1.326, 2026-11-17.
  Verified: source already on 2.1.327.
  Verified: re-run on claude 2.1.327, 2026-11-19: partial: "claude-platform" x15 in 2.1.327 binary and no cc-plugin-claude-platform check made; validate-probe and size figures not re-run

## Request Size


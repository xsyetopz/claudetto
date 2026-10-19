# Plugin Layout Slices

This page tells what a slice folder holds, how the texts of a slice work, and how to add a slice.
A contributor reads it before a new slice.
It follows [Plugin Layout](Plugin-Layout).

## The Parts of a Slice

The slice `handoff` shows the usual parts:

```text
src/plugins/claudetto/slices/handoff/
  slice.ts              the manifest: the name, the ladder line, and each part
  limits.ts             the bounds of the slice
  domain/               pure code: data and functions, no I/O
  adapters/mod.ts       mod handlers
  prompts/              the texts for Claude and for the user
  evals/handoff/        eval cases
  lab/compaction.test.ts  a hook lab test
```

Other slices add these parts when they need them:

| Part | Use | Output in `plugins/<plugin>/` |
| --- | --- | --- |
| `slice.ts` | Always. It exports `slice`, and `slice.name` equals the folder name. | Lines in `plugin.json`, `hooks.json`, and `register.ts` |
| `domain/` | Pure logic, with no import of an adapter. | `slices/<s>/domain/` |
| `adapters/mod.ts` | The functions that a mod handler runs. | `hooks/register.ts`, and `slices/<s>/adapters/mod.ts` |
| `adapters/cli.ts` | A CLI. It exports `main`. | `bin/<bin>`, a launcher, and `slices/<s>/adapters/cli.ts` |
| `skills/<name>/SKILL.md` | A skill. | `skills/<name>/SKILL.md` |
| `styles/<name>.md` | An output style. | `output-styles/<name>.md` |
| `prompts/` | The texts that the slice gives to Claude or to the user. | `slices/<s>/prompts.ts` |
| `lab/*.test.ts` | Hook lab tests. | `tests/*.test.ts`, which `claude plugin test` runs |
| `evals/<case>/` | Eval cases. | `evals/<case>/` |
| `limits.ts` | The bounds of the slice. | `slices/<s>/limits.ts` |

The `skills` field of `slice.ts` declares the skills that the slice ships.

## The Prompt Files of a Slice

Each text of a slice that goes to Claude or to the user is a file in `prompts/`, and not a string in the code.
Examples are a deny reason, a notice, and the prompt of a side model.
`tools/generate/emit/prompts.ts` writes the module `prompts.ts` from the folder, and the code imports each text from `../prompts.ts`.

| Source | Export in `prompts.ts` |
| --- | --- |
| `prompts/deny-reason.md` | `DENY_REASON`, a string |
| A `.md` file with a parameter such as `{{command}}` | A function, such as `DENY_REASON({ command })`, that gives a string |
| `prompts/automode.json` | `AUTOMODE`, an object |

- A name in lowercase in double curly braces is a parameter.
  The code gives its value as a string at run time.
- A name in uppercase in double curly braces is a value that the generator fills from `limits.ts` of the slice, or from `VALUES` in `tools/generate/emit/fill.ts`.
  A number gets the form `20,000`.
- A line `{{include name}}` gives the text of `src/fragments/name.md`.
- The code keeps the choice between texts, the short labels, and the log lines.

The hook lab tests in `lab/` import the texts from `../prompts.ts`, and `just generate` changes the import to the module in the copy of the slice.
The description of a plugin is `description.md`, with one sentence on each line, and `just generate` joins the lines into the manifest.

## How to Add a Slice

1. Choose the plugin.
   A feature that costs tokens when unused, or that needs an outside tool, goes in an add-on plugin ([Add-Ons](Add-Ons)).
2. Create `src/plugins/<plugin>/slices/<s>/slice.ts`.
   Export `slice` with `name` set to the folder name and a `ladder` line.
   Add each part that the slice needs, such as `mod`, `cli`, `skills`, or `userConfig`.
   The contract is in `src/kernel/slice.ts`.
3. Add the code.
   Put the logic in `domain/` and the entry points in `adapters/`.
   Export each mod handler from `adapters/mod.ts`, and name it in `run`.
4. Add the texts.
   Put each skill in `skills/<name>/SKILL.md`, and each message to Claude or to the user in `prompts/<name>.md`.
5. Add the bounds to `limits.ts` of the slice, and the shared bounds to `src/kernel/budget.ts`.
   Do not put a bound in two files.
6. Add the tests.
   Put the repository tests in `tests/<folder>/<s>/`, and the hook lab tests in `lab/`.
   Name each hook eval in `evals` of its mod handler.
   Add a `controls` record for each hook.
7. For a new plugin, add `src/plugins/<plugin>/plugin.ts` that exports `plugin`, a `description.md`, and the name in `src/marketplace.ts`.
8. Run `just generate`, then `just check`.
   Commit the source and the generated files together.

The fixture of the generator tests is in `tests/tools/generate/fixture/`.

## Related Pages

- [Plugin Layout](Plugin-Layout): the folders and the import rules.
- [Architecture Generate](Architecture-Generate): what the generator writes.
- [Controls](Controls): the record of each hook and guard.

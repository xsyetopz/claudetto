# Lab

The plugin `dotclaude-lab` has tools for plugin authors.
Read this page if you write or test a plugin, or if you build the settings schema.

The plugin has four slices, and each slice has one command.
The slice `sandbox` runs Claude Code in a config folder apart from yours (`dotclaude-sandbox`).
The slice `capture` logs the requests of Claude Code and sizes their parts (`dotclaude-capture`).
The slice `schema` writes the JSON Schema of `settings.json` (`dotclaude-schema`).
The slice `eval-compare` compares the eval scores of two plugin folders (`dotclaude-eval-compare`).
The plugin has no hook and no `lab/` test.
The hook lab of `just lab` runs nothing for it.
The plugin works without the core plugin.
It imports nothing from another plugin.

The source is in `src/plugins/dotclaude-lab/`.
The folder `plugins/dotclaude-lab/` is generated.
Do not edit it by hand.
The plugin has no `limits.ts` file.

## What It Adds

- Four commands on `PATH`, one for each slice: `dotclaude-sandbox`, `dotclaude-capture`, `dotclaude-schema`, and `dotclaude-eval-compare`.
- The skill `/eval-compare`, which runs `dotclaude-eval-compare`.
  The skill sets `disable-model-invocation: true` in `SKILL.md`.
- No hook, no MCP server, no `userConfig`, and no Claude Code setting.

## Install

1. Install the plugin with `/plugin install dotclaude-lab@dotclaude`.
2. Make sure that these tools are ready:
   - Bun 1.4.3 or later.
     The commands are Bun scripts (the shebang of each file in `bin/`).
   - The `claude` executable on `PATH`.
     The sandbox and `dotclaude-eval-compare` need it.
     `dotclaude-schema` needs it when you do not pass `--bundle`.
   - A login token for the sandbox.
     See the Login Token section on this page.

## The Sandbox

```text
dotclaude-sandbox [--dir DIR] [claude arguments...]
dotclaude-sandbox [--dir DIR] --clean
dotclaude-sandbox [--dir DIR] --check-frontmatter ...
```

The sandbox runs Claude Code in a config folder apart from yours.
A test of a plugin then cannot change your settings, sessions, or installed plugins (the header of `slices/sandbox/adapters/cli.ts`).

- The first form sets up the folder, then runs `claude` with the arguments.
  The command loads no plugin by itself.
  Pass `--plugin-dir DIR` once for each plugin folder.
- The second form removes the folder.
  It refuses a folder that holds an entry outside the layout, and it exits 1 with the names of those entries.
  The default folder is always allowed (`cleanRefusal` in `slices/sandbox/domain/clean.ts`).
- The third form adds `--debug-file` and `-p "Reply with OK."` to the call.
  It prints each line of the debug log that names an unknown field.
  It exits 1 when the session fails.
  It also exits 1 when the log names a field.

The `--dir DIR` option sets the folder.
A value that starts with `--` is refused.
`--dir --clean` exits 1 with a message, and it does not take `--clean` as the folder.
The default is `dotclaude-sandbox` in the system temp folder (`SANDBOX_TEMP` in `src/kernel/temp-paths.ts`).
The folder holds three parts:

- `config/`, which is `CLAUDE_CONFIG_DIR`.
  The setup marks onboarding as done, and it trusts `project/` (`setUp` in `slices/sandbox/adapters/setup.ts`).
- `project/`, an empty git repository that is the working directory.
- `home/`, which is the `HOME` of Claude Code.
  A setup script that changes shell files changes only the sandbox.

A managed setting can lock a plugin name.
Then Claude Code ignores the `--plugin-dir` copy.
The debug log says that managed settings lock the plugin (the header of `slices/sandbox/adapters/cli.ts`).

`claude` must be on `PATH` as an executable.
A shell function or an alias does not work.

### Login Token

The command reads the token from these sources, in this order (`loginToken` in `slices/sandbox/adapters/login.ts`):

1. The variable `CLAUDE_CODE_OAUTH_TOKEN`.
2. On macOS, the Keychain entry `Claude Code-credentials`.
3. The file `~/.claude/.credentials.json`.

The token goes only into the environment of the child process.
The command does not write the token to disk or print it.
If no token is found, the command still runs.
It says so.

### The Child Environment

The child process drops the variables that the parent Claude Code session sets for its own tools (`SESSION_VARS` and `SESSION_PREFIXES` in `slices/sandbox/adapters/login.ts`).
In the sandbox, they would join the parent session or fake its state.
The child process also drops each variable that your own settings `env` sets to the same value.
A value that you pass for the sandbox on the command line stays.

### The Model Check

Claude Code gives no error for a `--model` that the sandbox does not list.
The session then runs on another model.
So the command reads `availableModels` of the sandbox.
It warns when the model is not in that list (`slices/sandbox/adapters/cli.ts`).

## The Capture Proxy

```text
dotclaude-capture [--port 8787] [--out DIR] [--upstream URL] [--no-count] [--count FILE]
ANTHROPIC_BASE_URL=http://127.0.0.1:8787 ENABLE_TOOL_SEARCH=true claude
```

The proxy forwards each request to the upstream.
It writes the body of each `/v1/messages` request to `DIR`.
The default folder is `dotclaude-capture` in the system temp folder (`CAPTURE_TEMP` in `src/kernel/temp-paths.ts`).
The default port is 8787.
`--port` takes a whole number from 1 to 65535.
Another value exits 2 with a message.

- The proxy never writes a request header, because the headers carry the credential.
  It sends upstream only the headers that match `PASS` in `slices/capture/adapters/cli.ts`.
- The proxy takes the upstream from the first of these sources that is set:
  1. The `--upstream` flag.
  2. `ANTHROPIC_BASE_URL`.
  3. `https://api.anthropic.com`.
  The default is `DEFAULT` in `slices/capture/domain/upstream.ts`.
- The proxy refuses an upstream that is its own address, because the requests would loop.
  The check looks at the host names in `LOOPBACK` (`127.0.0.1`, `localhost`, and `[::1]`) with the port of the proxy.
  It does not limit the upstream to a loopback address.
- For the first `/v1/messages` request with tools, the proxy sizes each part with the `count_tokens` endpoint.
  It counts the full request.
  Then it counts the request without one tool, one block, or one section of a long text.
  The difference is the token cost of that part, with its wrapper.
- A text longer than `SPLIT_CHARS` characters is sized by section (`slices/capture/domain/report.ts`).
- At most `MAX_PART_COUNTS` parts (64) of one request get a `count_tokens` call.
  The report lists each later part with no token count and a note that it is past the bound.
- A `count_tokens` call that gets HTTP 429 is retried.
  The proxy makes up to `COUNT_ATTEMPTS` attempts (4), waits `COUNT_BACKOFF_MS` (500 ms) before the second attempt, and doubles the wait before each later attempt.
  These bounds are in `slices/capture/limits.ts`.
- A `/v1/messages` body that is not JSON is forwarded unchanged.
  The proxy does not save it, and it does not size it.
- With `--count FILE`, the proxy sizes `FILE` instead.
  It uses the credential of the first request.
- The report goes to `DIR/report-<n>.json` and to standard output.

The repository runs the proxy with `just capture`.

## The Schema Writer

```text
dotclaude-schema --out DIR [--bundle FILE] [--version X.Y.Z]
```

The writer reads the installed Claude Code bundle.
It writes two files to `DIR`:

- `claude-code-settings.json`, the schema of `settings.json`.
- `claude-code-managed-settings.json`, the schema of `managed-settings.json`.

The file names are in `slices/schema/domain/build.ts`.

- The option `--out` is required.
  The command exits 2 without it, so it never writes into a folder by chance (`slices/schema/adapters/cli.ts`).
- Without `--bundle`, the command reads the file that `claude` on `PATH` resolves to.
- Without `--version`, the command takes the version from the name of the bundle, or from the output of `--version`.
- The writer reads the bundle and never changes it.
  The repository forbids a patch of the Claude Code binary or its npm package (`CLAUDE.md`).
- The bundle has no list of the managed-only keys.
  `MANAGED_ONLY` in `slices/schema/domain/managed.ts` matches phrases in the descriptions instead.
- The schema build follows the references of the bundle to a depth of `DEPTH_MAX` levels.
  It stops at a reference that is already on the stack, so a loop ends (`slices/schema/domain/types.ts`).
- The scan of the bundle is in `slices/schema/domain/scan.ts`.

The repository writes the schemas to `schemas/` with `just schema`.

## The Eval Compare

```text
dotclaude-eval-compare A B [claude plugin eval options...]
```

The command runs `claude plugin eval` on the plugin folders `A` and `B`, one after the other.
Each run scores a plugin arm against the same no-plugin baseline arm (the header of `slices/eval-compare/adapters/cli.ts`).
So the two tables show which plugin folder scores better.

- The command adds `--max-cost-usd 5` to each run when your options set no cost bound (`withCostBound` in `slices/eval-compare/domain/compare.ts`).
- The command adds no `--scaffold` and no `--allow-tools`.
- The command exits 0 when both runs succeed.
  It exits 2 when a folder is missing, or when a folder name starts with `-`.
- The verdict is built in `slices/eval-compare/domain/compare.ts`.

Each run costs money.
The skill `/eval-compare` asks you to check the two folders before it runs the command.
The skill finds each folder by its `.claude-plugin/plugin.json` file and its `evals/` folder (`SKILL.md`).

## The Hook Lab

The command `just lab` runs `bun tools/lab.ts`.
That script runs `claude plugin test` on each plugin folder that has a `tests/` folder.
The hook lab tests of a slice are in its `lab/` folder.
The generator copies them to the `tests/` folder of the plugin (the comment in `tools/generate/emit/slices.ts`).

Run `just lab` before a live session when a change touches `hooks/register.ts`.
The plugin `dotclaude-lab` has no `tests/` folder, so the script skips it.

## Bounds

| Bound | Value | File | Use |
| --- | --- | --- | --- |
| `SPLIT_CHARS` | 2000 characters | `slices/capture/domain/report.ts` | A longer text is sized by section |
| `MAX_PART_COUNTS` | 64 parts | `slices/capture/limits.ts` | The parts past it are not counted |
| `COUNT_ATTEMPTS` | 4 attempts | `slices/capture/limits.ts` | A `count_tokens` call that gets HTTP 429 is retried |
| `COUNT_BACKOFF_MS` | 500 ms | `slices/capture/limits.ts` | The wait before the second attempt, doubled after each attempt |
| `DEPTH_MAX` | 8 levels | `slices/schema/domain/types.ts` | The reference depth of the schema build |
| `--max-cost-usd` | 5 USD for each run | `slices/eval-compare/domain/compare.ts` | The default cost bound of `dotclaude-eval-compare` |
| `START_TOKENS` | 9,960 tokens | `tools/limits.ts` | The bound of the start measure that `just start-run` runs (`tools/measure.ts`) |

The value 5 of `--max-cost-usd` is written in the domain file.
It is not in a `limits.ts` file.

## Why

- The sandbox keeps a test from changing the settings, the sessions, and the installed plugins of the user.
  See the header of `slices/sandbox/adapters/cli.ts`.
- The schema comes from the installed bundle, so it follows the version that the user runs.
  See D10 in [Decisions-Settings](Decisions-Settings).
- The evals run through `claude plugin eval`, and dotclaude owns no eval harness.
  See D9 in [Decisions-Tools](Decisions-Tools).
- The reports state measurements, and they do not take a figure from the model.
  See D27 in [Decisions-Evidence](Decisions-Evidence).
- Each add-on stays a separate plugin.
  See D24 in [Decisions-Layout](Decisions-Layout).

## Related Pages

- [Troubleshooting](Troubleshooting): the symptoms of the sandbox and the lab, and their fixes.
- [Settings Schema](Settings-Schema): the schema that the schema writer builds.
- [Add-On Plugins](Add-Ons): the list of the add-on plugins.

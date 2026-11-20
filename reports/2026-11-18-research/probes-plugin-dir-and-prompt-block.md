# Probes: Relative `--plugin-dir` and `suppressOriginalPrompt` (claude 2.1.327, 2026-11-18)

Both probes ran through cc-inspect `code cli` on a fake API (stream-json, one prompt). No request reached a paid API.

## Relative `--plugin-dir` (RISK-458)

Hypothesis: a relative `--plugin-dir` is resolved against the process working directory, not the caller's directory.

| Run | `--plugin-dir` | Result |
| --- | --- | --- |
| 1 | `../../../../../../../../../../../../Users/.../handover-probes/probe-j/p` (resolves from any temp cwd, since extra `..` stops at `/`) | init `plugins` lists `hprobe` with the absolute path; exit 0 |
| 2 | `probe-j/p` (does not exist under the temp cwd) | init has no `hprobe`; init `plugin_errors` holds `{"plugin":"inline[0]","type":"path-not-found","path":"<temp cwd>/probe-j/p"}`; the run continues and exits 0 |

Code: chunk-m14bt1pz.js@5450426 logs `Plugin path does not exist: <path> (<errno>), skipping` at warn level and keeps going.

Result: a relative path works when it exists from the cwd. A wrong one does not fail the run: the only signals are the init `plugin_errors` entry and the debug log. A probe harness must check that init `plugins` names the plugin under test, or pass an absolute path.

## `suppressOriginalPrompt` on a UserPromptSubmit block

Hypothesis: the field removes the trailing `Original prompt: <text>` from the block message and changes nothing else.

The hook was set through `--settings` inline JSON (no settings file written). It ran `h.sh <bool>`, which prints `{"decision":"block","reason":"BLOCKED-X","hookSpecificOutput":{"hookEventName":"UserPromptSubmit","suppressOriginalPrompt":<bool>}}`. The prompt was `SECRET-PROMPT-TEXT`.

| `suppressOriginalPrompt` | Result text and `system/informational` content | Model requests |
| --- | --- | --- |
| `true` | `UserPromptSubmit operation blocked by hook:\nBLOCKED-X` | 0 |
| `false` | `UserPromptSubmit operation blocked by hook:\nBLOCKED-X\n\nOriginal prompt: SECRET-PROMPT-TEXT` | 0 |

Both runs report `prompt_submit_outcome {"kind":"blocked_by_hook","prompt_kept":false}`.

Code:
- chunk-z02chaqz.js@39169 appends `Original prompt:` unless the flag is true. The same happens for UserPromptExpansion at @44709.
- chunk-m14bt1pz.js@4257189 sets the flag on its own for an exit-2 hook whose stdio closed early.

Result: the field only controls whether the blocked prompt is echoed back in the warning, which the user sees and stream-json clients receive. A blocked prompt never reaches the model either way. Use `true` when the prompt may hold a secret that the hook blocked it for.

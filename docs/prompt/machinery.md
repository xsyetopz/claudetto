# The Auto Mode Classifier Request

Auto mode sends a separate request to a classifier when the model calls a tool that no rule already allows. Each reading is `just capture --classifier --arm plain` on Claude Code `2.1.317`, against a fake Messages API with no model call. The fake answers the first main request with a `Bash` call of `git push origin main`, which auto mode sends to the classifier. The fake's `ok` is no verdict, so the program retries and then blocks the call. `docs/surfaces.md` holds the method.

## The Request

The classifier request carries no tools. Its system blocks are 74, 140,015, and 248 characters, `messages` is 616, and the whole is 141,962. The last system block holds the login name, so it differs between logins. The plugin arm reads the same, so claudetto adds nothing to this request.

| Part | Default model | `CLAUDE_CODE_AUTO_MODE_MODEL=claude-haiku-5-5` |
| --- | --- | --- |
| `model` | `claude-sonnet-5` | `claude-haiku-5-5` |
| `system[1]` | 140,015 | 140,239 |
| `messages` | 616 | 829 |
| `max_tokens` | 64 | 2112 |
| `stop_sequences` | `</severity>` | `</block>` |
| `thinking` | `{"type":"disabled"}` | absent |

`just capture --classifier --arm plugin --shipped` sends no classifier request: the program answers that a session behind `127.0.0.1` is not eligible for the classifier billing change. So the rungs below use the `plain` arm with `--settings FILE`, and the suite row loads the lists of the shipped settings into that arm.

## Size per Rung

One `autoMode` list replaced by one rule `"Run tests."`, without `$defaults`, read as `system[1]` with `just capture --classifier --arm plain --settings FILE`:

| Rung | `system[1]` | Cut |
| --- | --- | --- |
| built-in | 140,015 | 0 |
| all four lists `[]` | 140,015 | 0 |
| `allow` replaced | 132,600 | 7,415 |
| `soft_deny` replaced | 75,266 | 64,749 |
| `hard_deny` replaced | 134,747 | 5,268 |
| `environment` replaced | 136,482 | 3,533 |
| all four replaced | 59,050 | 80,965 |
| `soft_deny` `["Run tests.", "$defaults"]` | 140,028 | -13 |
| `soft_deny` `["$defaults", "Run tests."]` | 140,028 | -13 |
| claudetto suite (`suiteSnippet()` in `plugins/claudetto/src/automode/rules.ts`) | 63,147 | 76,868 |
| `CLAUDE_CODE_AUTO_MODE_MODEL=claude-haiku-5-5`, all four lists `"x"` | 59,238 | 80,777 |

- An empty list counts as unset and keeps the built-in rules. `$defaults` keeps them wherever it sits in the list.
- The four single cuts add to 80,965, the all-four cut, so each list is one block of text with no shared part. About 59,000 characters is the floor that settings reach; the rest is the frame of the prompt.
- The suite holds 7 `allow`, 9 `soft_deny`, and 1 `hard_deny` rules and 2 `environment` entries, 4,092 characters of entry text.
- Each cut removes block rules, and the default is "allowed". These readings are sizes only: whether a rung still blocks what the built-in rules block is unmeasured.
- The model setting: `CLAUDE_CODE_AUTO_MODE_MODEL` changes the request as the first table shows. This reading ran one user turn of `hi` and one `Bash` call in an empty folder, so a setting that acts on edits, email turns, or threads is not covered.

# you-should-know: Mod API Probe (P59)

## Method

The probe of 2026-10-14 read 2 sources, and ran no code of the bundle:

- The types file `plugins/dotclaude/.claude-plugin/types/claude-code/index.d.ts` (15,990 lines), for the calls and events that a third-party `hooks/register.ts` gets.
- The bundle extract of Claude Code 2.1.296 in `/tmp/claude-501/ysk2/all.txt`, lines 351770 to 351825, for the built-in `cc-plugin-you-should-know@builtin`.
  A Python search read the `export{… as NAME}` list of line 351818 to get the names and values of the constants.
  The extract is a temporary file and is not in the repository.

A third-party plugin is shown to use only 4 of these APIs live: `$.model.fork`, `ui.render` on `AbovePrompt`, `Button.hotkey`, and `$.prompt.fill`.
The evidence is `.dotclaude/spec/changes/1.0.0/evidence/you-should-know.md` ("Third probe" and "Sandbox Sessions", 2026-10-13) and the shipped code of `src/plugins/dcc-plugin-you-should-know/`.
The shipped plugin does not hook `turn.step` or `session.end`, and it does not call `$.clock.after`, `$.store`, or `$.prompt.submit`.
So the `copy` verdict of these 5 rests on the types file only.
The probe of 2026-10-14 ran no live session.
The live check of the band is P68 and P69.

## Table

| UX element | API | Bundle or types line | Verdict | Reason |
| --- | --- | --- | --- | --- |
| The check in a turn | `turn.step` as an async generator | bundle 351817 (`e("turn.step",async function*…`), types 1214, 4462, 4693 | copy | `turn.step` is in the hook map of the types file. The built-in skips a subagent step (`f.agentId!==void 0`). |
| The cadence of the check | `turn.step` index | bundle 351817, `CHECK_EVERY` 6 | copy | The check runs when `f.index>0&&f.index%CHECK_EVERY===0`, so at steps 6, 12, and so on. Step 0 only clears an old `asked` view and ages old offers. The brief of P59 says "a check at step 0", and this line does not agree. |
| The side model | `$.model.fork` | bundle 351817 (`s.model.fork({prompt:…})`), types 2640, 6369, 6861 | copy | The 1.0.0 evidence has a live fork from a third-party hook in 1005 ms. A fork has no tools. |
| The band above the prompt | `ui.render` with `component` `AbovePrompt` | bundle 351817 (`e("ui.render",{component:"AbovePrompt"},…`), types 10263 | copy | The shipped plugin uses it (`slices/notice/adapters/mod.ts:136`). Types 10261: "Raised on the terminal and desktop surfaces only", so no band shows on mobile and in vscode. |
| The header `✦` and the tag | `Text` with the theme key `suggestion` | bundle 351784 (function `U`: `"✦"`, then the tag and `" \xB7 "`), bundle 351784 (`star:{color:"suggestion"}`), types 12598 (`ThemeKey`) | copy | `suggestion` is a `ThemeKey`, and `Color` takes a `ThemeKey` (types 1689). The star is `suggestion` on the terminal, mobile, and vscode, and `subtle` on the desktop (the map `Lr` at bundle 351784). The literal text "You should know ·" is not in the extract, because the tag is an argument of `U`. |
| The rows and the buttons | `Button` with `hotkey` | bundle 351784 (function `Z`, `{hotkey,label,onPress,isDim,role}`), bundle 351778 (`hotkey:"3"`, "Return to topic", "What is this"), types 1094 | copy | The shipped plugin uses `hotkey` `"1"` and `"0"` (`slices/notice/adapters/mod.ts:150-153`). |
| The card width | `Box` `width` | bundle 351818, `CARD_WIDTH` 60, `STAR_CELLS` 2 | copy | Plain layout values. |
| The feedback row and its timeout | `$.clock.after` | bundle 351817 (`s.clock.after(Nr,…)`), `ASKED_MS` 20000 (bundle 351784), types 7141 | copy | `$.clock.after` is a third-party call. |
| The text in the composer | `$.prompt.fill` | bundle 351817 (`s.prompt.fill({text:…,mode:"replace"})`), types 2977, 8618 | copy | The shipped plugin uses `mode` `"insert"` (`slices/notice/adapters/mod.ts:166`). |
| The submit of a prompt | `$.prompt.submit` | bundle 351778 (the `calls` list), types 2946, 2954 | copy | `prompt.submit` is a third-party call. P69 step 4 limits the plugin submit to a surface with no composer. |
| The surfaces with an own composer | a constant | bundle 351784, `OWN_COMPOSER` `{terminal:false,desktop:true,mobile:true,vscode:true}` | near copy | No call returns this map, so the plugin must keep its own copy. `session.surfaces` is in the `calls` list of bundle 351778. |
| The state across turns and sessions | `$.store.get` and `$.store.set` | bundle 351789 (`e.store.get("sessions")`), types 3358 | copy | `$.store` is "A JSON file of the plugin's own". |
| The caps | constants | bundle 351818: `SESSIONS_MAX` 32, `SEEN_MAX` 50, `SHOWN_KEEP_MS` 259200000 (3 days), `SLUG_MAX` 48 | copy | Plain values. Dotclaude keeps its own bounds in its `limits.ts`. |
| The end of a session | `session.end` | bundle 351818 (`e("session.end",…)`), types 4424, 4432 | copy | `session.end` is in the hook map. |
| The analytics rows | `$.telemetry.log` and `telemetry.mark` | bundle 351778 (the `calls` list), bundle 351818 (`s.telemetry.log` in `session.end`), types 3131-3147 (`log`), 3156-3168 and 4307 (`mark`), 4287 | gap | Types 3140: "A first-party row is queued by the built-in plugin". The plan is that the plugin writes `$.ui.log` lines (types 2409-2416) in place of these rows. The shipped plugin writes none now. |

## Gaps

- `$.telemetry` is the only gap among the elements of the table.
  The plan is that the plugin uses `$.ui.log`, which goes to the debug log and to the host as `ui_log`.
- The probe did not check the other entries of the bundle `scan` list: `ui.toast`, `prompt.read`, `state.get`, `state.set`, `env.get`, `command.run`, and `session.detach`.
- `OWN_COMPOSER` is a near copy.
  It is a fixed map in the bundle, so a new release can change it without a change to the types file.

## Wrong Facts in the Brief

- The brief says the built-in checks "at step 0 and each 6th step".
  The condition at bundle line 351817 runs the check at steps 6, 12, and so on, and step 0 does a cleanup only.
  This is my reading of minified code, so P68 must confirm it in the live check.
- The brief cites the header at bundle line 351818.
  The header code is function `U` at bundle line 351784, and line 351818 holds the `export` list and the plugin description.

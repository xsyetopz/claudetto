# Surfaces of Claude Code and What Turning Them Off Costs

Claudetto is for the CLI and the TUI only (user, 2026-10-27: "claudetto will disable as many surfaces as claude code allows, such as the builtin skills, claude.ai sync, artifacts, design, whatever garbage nobody really needs. claudetto is only for the CLI/TUI." and "When user said 'claudetto aims to optimize heavily', they meant it.").
This file holds the measurement first and the key inventory second, because a key is worth writing only when a reading shows what it changes.

## How the Numbers Were Taken

Free probe, no model call, no paid run.
A local Bun server on port `18765` answered `POST /v1/messages` with a short fake stream and wrote each request body to `/tmp/stubreq/req-N.json`.
Each row is one `claude -p "hi"` run in an empty folder with `ANTHROPIC_BASE_URL=http://127.0.0.1:18765`, a fake key, and `CLAUDE_CONFIG_DIR=/tmp/stubcfg`, so only the settings file of that row differs.
The installed version is Claude Code `2.1.311` and the request named the model `claude-opus-5-5`.
The unit is characters of the JSON that the run sent, counted by `JSON.stringify` of each part. It is not tokens. A token figure needs a counting call, which is paid, so none is claimed here.

Limit of the probe: the key is fake, so a surface that a login gates may be absent because the login is absent and not because it is off by default. The `cc-inspect` skill states the same for its own tool listing, "The per-session filters are not in it, so a listed tool may still be off for a user: confirm with a probe before you say a tool is available." A reading on the real login is still to be taken.

## The Baseline of the New Tree

This is the reading that every size claim of the rebuild cites. The rows further down this page were
taken against the archived tree on Claude Code `2.1.311` with a probe built by hand outside the
repository, so they are method and history, not a baseline: no claim of this change cites a number
from above this line.

Read on 2026-10-28 and 2026-10-30 on Claude Code `2.1.312` and read again on 2026-10-30 on `2.1.314` (`claude --version`),
with `just capture`, which is
`tools/capture/run.ts` of this repository. The harness starts a fake Messages API on a free loopback
port in its own process, runs `claude -p "hi"` once per arm, and scores the first request body. Each
arm gets a fresh temporary working folder and a fresh temporary `CLAUDE_CONFIG_DIR`, so no session,
memory, settings file, or installed plugin of this machine reaches the reading, and each arm gets a
fake API of its own, so no two arms share a request list. The environment of each run is
`ANTHROPIC_BASE_URL` at the loopback server, `ANTHROPIC_API_KEY=sk-ant-fake`,
`DISABLE_TELEMETRY=1`, `DISABLE_ERROR_REPORTING=1`, and `DISABLE_AUTOUPDATER=1`. No settings file is
written in the `plain` arm, so it reads the defaults of the installed version. The tool reported one
request to the messages route and one to another route per arm, and the only host in play is
`127.0.0.1`, so the reading is free and no provider is reached.

| Arm | Settings | Total chars | `system` chars | `system` blocks | Tools | `tools` chars | `messages` chars |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `plain` | defaults, no file | 46,105 | 5,954 | 74, 62, 5,818 | 12 | 29,512 | 9,984 |

On 2026-10-28 a second row, the `plugin` arm with `--plugin-dir plugins/claudetto`, read equal to this
one to the character, because the plugin was then one empty mod with no skill, no subagent, no
command, and no output style. It is not equal now: the plugin ships a `tool.describe` hook, two
agents, an output style, a handoff block, and a skill, so the row is dropped and the `plugin` arm is
read under "The Shipped Combination" below. A tree that lands prompt text while the `plugin` arm
stays equal to `plain` is a finding to dig into and not a pass.

The `plain` row read 42,687 with a `system` of 5,764 on 2026-10-28, 42,879 with 5,954 on 2026-10-30
under `2.1.312`, and reads 46,105 with 5,954 on `2.1.314`, where `tools` grew 28,187 to 29,512
and `messages` 8,061 to 9,984 and `system` held. "The Baseline Has Drifted" below is the record of
the first move, and "The Baseline Moved Again" the second.

The 12 tool definitions of the baseline, each as the characters of its own JSON:

| Tool | Chars |
| --- | --- |
| `Workflow` | 5,355 |
| `Agent` | 5,246 |
| `ScheduleWakeup` | 4,886 |
| `Bash` | 3,715 |
| `ReportFindings` | 2,177 |
| `Read` | 1,919 |
| `Skill` | 1,803 |
| `ToolSearch` | 1,440 |
| `ListAgents` | 1,151 |
| `Edit` | 964 |
| `Write` | 639 |
| `DeferredToolPlaceholder` | 204 |

### The Working Folder Path Is Part of the Score

The first reading of this harness came out at 42,789 and the second at 42,657, with nothing changed
but the temporary folder the run worked in. The cause is in this page already: the third `system`
block ends in the environment block, which holds the working directory. So the length of the working
folder path is part of every figure here, and a harness that lets it vary cannot compare two
readings.

`tools/capture/run.ts` therefore builds each run's folders under the prefix `/tmp/claudetto-capture-`
rather than under `tmpdir()`, which on macOS is a per-user path of about 50 characters under
`/var/folders/`. `mkdtemp` still picks the last six characters, so no other process can plant the
folder first, and the path length is 34 characters on any machine. The tool prints that length
beside each reading, so a drift shows up instead of passing silently. The 42,789 reading was taken
under the macOS `TMPDIR`, which is 132 characters more than the same tree read under `/tmp`.

Three readings of the same tree, taken together on 2026-10-28, which is the evidence for the
paragraph above. The third row read 42,879 on `2.1.312` and reads 46,105 on `2.1.314`, for the engine's reason in "The Baseline Has
Drifted", and the comparison among the three holds:

| Working folder | Path chars | Total chars | `system[2]` | `messages` chars |
| --- | --- | --- | --- | --- |
| `/var/folders/.../T/capture-XXXXXX/work` | about 56 | 42,789 | 5,696 | 8,095 |
| `/tmp/capture-XXXXXX/work` | 24 | 42,657 | 5,608 | 8,051 |
| `/tmp/claudetto-capture-XXXXXX/work` | 34 | 42,687 | 5,628 | 8,061 |

One character of path costs about three characters of request, because the path appears in the
system block and twice in the message text. The archived `{}` row of 42,676 was read in
`/tmp/stubwork`, a 13-character path, on `2.1.311`, so it is not comparable with the `plain` baseline
above and the difference between them is not a version effect. That is one more reason no claim of this
change cites a figure from above this section.

## The Deny List of the New Tree

Read on 2026-10-28 and again on 2026-10-30 with `just capture --arm plain --deny <names>` on Claude
Code `2.1.312` and `2.1.314`, each row one run against the baseline above, with the same harness, the same 34-character working folder, and
no other settings key. The harness writes the settings file itself from `--deny`, so a row cannot
drift from a scratch file on disk.

| Deny of the run | Total chars | Change | Tools | `tools` chars | `system` chars | `messages` chars |
| --- | --- | --- | --- | --- | --- | --- |
| nothing, the baseline | 46,105 | | 12 | 29,512 | 5,954 | 9,984 |
| `Workflow` | 40,749 | −5,356 | 11 | 24,156 | 5,954 | 9,984 |
| `ScheduleWakeup` | 41,218 | −4,887 | 11 | 24,625 | 5,954 | 9,984 |
| `ReportFindings` | 43,927 | −2,178 | 11 | 27,334 | 5,954 | 9,984 |
| all three | 33,684 | −12,421 | 9 | 17,091 | 5,954 | 9,984 |
| `DesignSync` | 46,093 | −12 | 12 | 29,512 | 5,954 | 9,972 |
| `Artifact`, `RemoteTrigger`, `TaskCreate`, `TaskGet`, `TaskList`, `TaskUpdate`, `mcp__computer-use` | 46,105 | 0 | 12 | 29,512 | 5,954 | 9,984 |

So the deny list claudetto writes is `Workflow`, `ScheduleWakeup`, and `ReportFindings`, which is
12,421 characters of the first request for three tools this project does not use. The three rows are each the
tool's own definition plus the comma that joined it (5,355 + 1, 4,886 + 1, 2,177 + 1), `system` and
`messages` do not move in any of them, and the combined row equals the sum, so nothing grew in the
place of what left. `plugins/claudetto/src/deny.ts` holds these numbers and
`plugins/claudetto/src/__tests__/deny.spec.ts` checks the arithmetic of every row, so a name without a reading
cannot enter the list.

What each deny costs, because a deny is a gate as well as a size lever. `Workflow` is Dynamic
Workflows, which the spec already rules out for this project. `ReportFindings` renders code-review
findings in a host UI, and the `/code-review` text itself tells the model not to use it unless the
active instructions ask for it. `ScheduleWakeup` is the one of the three that a CLI user can want:
it arms the autonomous `/loop` and the session crons that `session_crons` of the `Stop` input
reports. It is denied anyway, because the archived snippet also set `CLAUDE_CODE_DISABLE_CRON=1`, so
the two agree, and because claudetto's own goal loop does not call it: a search of the installed
`claudetto` finds the name only in its own deny list. A user who wants `/loop` drops
this one name and pays 4,887 characters a session for it.

Two names of the archived snippet are dropped here, each on its own reading. `DesignSync` is a
deferred tool, so denying it removes no definition; the 12 characters it saves are its name in the
deferred-tool list inside `messages`, which is the same finding as for the plan and
task tools. The other seven change nothing at all, so by the spec's "Deny of an Absent Tool" they
stay out until a reading on the real login shows them. That reading is still open, and it is the one
limit of this section: the key is fake, so a surface a login gates may be absent because the login
is absent.

The three names that were read as never to be denied were read again here rather than taken from the
archived page, because that page read tokens on `2.1.311`. In characters on `2.1.314`, read on
2026-10-30 against the 46,105 baseline, denying `ToolSearch` takes the request to 83,027 because 12
deferred tools load (`tools` 66,830, 23 definitions), and denying `Skill` takes it to 54,825 because the
`Workflow` definition grows from 5,355 to 22,310 characters (`tools` 44,663, `messages` 3,721). Denying
`Bash` no longer raises the request: it takes it to 45,698, 407 characters under the baseline, because
`Grep` at 3,224 and `Glob` at 731 arrive in place of a `Bash` of 3,715 (`tools` 29,753, 13 tools) and
`messages` falls 9,984 to 9,336. The token readings the spec cites (+15,898, +5,599, +384) were not
taken again, because `just capture` counts characters, and the `+384` of `Bash` no longer agrees in
sign with the character reading. `denyFaults` of `plugins/claudetto/src/deny.ts` still fails a list
that holds any of the three and names both figures, and the `Bash` message now prints a negative
growth, which is a claim the reading no longer supports.

No cost reading exists for this cut yet: it is 12,421 characters off every request of a session, and
whether that lowers billed cost per finished task is the gate of the cost readings below.

## The Tool Texts of the New Tree

Claudetto sends its own description for five tools through a `tool.describe` hook, and only while
ours is shorter than the description the harness computed for that session, so a text of ours can
never make a request larger. `plugins/claudetto/src/tools/texts.ts` holds the texts,
`plugins/claudetto/src/tools/tools.ts` holds the readings and the rule, and
`plugins/claudetto/src/register.ts` registers the hook.

Two stock readings per tool, because a stock description is not one fixed number. `docs` is the
`clawdipedia` route `prompts/tools` for `2.1.312`, fetched on 2026-10-28. `capture` is our own
`just capture --arm plain --deny ToolSearch --tools 30` of the same day, which loads every deferred
tool and so reads all 20 descriptions in one free run. The two agree on 17 of the 20 and differ on
`Agent` (3,227 against 2,906), `Bash` (1,934 against 1,267), and `ScheduleWakeup` (3,396 against
3,148). Each of those three has a session-dependent part, and the `Bash` difference is the git
section of its text, which the docs capture had and our empty temporary folder does not. The check
therefore holds the smaller of the two, so a text that passes it is shorter in either session.

| Tool | Stock, smaller reading | Claudetto | Saved |
| --- | --- | --- | --- |
| `Agent` | 2,906 | 973 | 1,933 |
| `Bash` | 1,267 | 1,090 | 177 |
| `Edit` | 360 | 328 | 32 |
| `ListAgents` | 777 | 695 | 82 |
| `Read` | 790 | 538 | 252 |
| `Skill` | 1,417 | 1,023 | 394 |
| `ToolSearch` | 953 | 727 | 226 |
| `Write` | 240 | 196 | 44 |
| total | 8,710 | 5,570 | 3,140 |

`Edit`, `ListAgents`, and `Write` were added on 2026-10-30 and are the last three upfront tools that
had no text. A shipped request carries nine definitions, and the ninth is
`DeferredToolPlaceholder` at 83 characters, which has nothing to give. `SendMessage` has a text too,
3,008 against a stock 4,259, and it is not in this table because the harness defers it, so its 1,251
reaches no request until `ToolSearch` loads the schema.

The effect on the request, read with `just capture --deny Workflow,ScheduleWakeup,ReportFindings
--tools 12`, both arms in the same run:

| Arm | Total chars | Tools | `tools` chars | `system` chars | `messages` chars |
| --- | --- | --- | --- | --- | --- |
| `plain` | 33,684 | 9 | 17,091 | 5,954 | 9,984 |
| `plugin` | 31,018 | 9 | 12,919 | 5,954 | 11,490 |

So the eight texts take 4,172 characters off the `tools` array on `2.1.314`, and the `plugin` arm's
per-tool descriptions read 973, 1,090, 328, 695, 538, 1,023, 727, and 196, which are our texts to the
character. The fall of 4,172 is 1,032 more than the 3,140 of the table above, and was 31 more on
`2.1.312`. The table holds the smaller stock reading of each tool, and the capture reads `Agent` at
3,227 and `Bash` at 1,934 here, the larger ones, which adds 1,070 to the string lengths: 4,128 by
those readings, and the 44 left are the characters that JSON escapes in the stock texts more than in
ours. The stock readings of the table are of `2.1.312` and were not taken again. That is also the first reading that proves a
`tool.describe` hook changes the request body and not only the screen, which `docs/gates.md` had as
code-read only.

This run was taken again on 2026-10-30 for the three new texts, and the `plain` arm moved too, 30,521
to 30,713 under `2.1.312`, with its `system` block 5,764 to 5,954, and to 33,684 on `2.1.314`. Nothing of ours touches either figure: the `plain`
arm loads no plugin, and `system` there is the engine's own default body. So the +192 is the installed
Claude Code changing under the recording, not an effect of this change, and it is the same +192 that
separates the `BASELINE_TOTAL` of `plugins/claudetto/src/deny.ts:5` from a default capture taken the
same day. "The Baseline Has Drifted" below is the record of that finding and its repair.

Read `system` and `messages` here rather than the total, because this run isolates the tool texts and
nothing else: it sets no `agent` and no `outputStyle`, so `system` holds the default body in both arms
at 5,954. `messages` is not equal across the arms and must not be read as part of the tool-text
saving. It carries two pieces the plugin adds whatever the tool texts do, the handoff context block of
`plugins/claudetto/src/handoff.ts` and the agent listing for `Artemis` and `Athena`, which is why the
`plugin` total falls by less than its `tools` array does: 11,490 against 9,984 in `messages`. "Shipped Cuts" below prices those two.

Two rules hold this in place, both in `plugins/claudetto/src/tools/tools.ts` and both checked by
`plugins/claudetto/src/tools/__tests__/tools.spec.ts`. `deadTexts` names any text that is not shorter than its stock
reading, so a text that stops winning fails the gate instead of sitting unread in the repository;
the archived tree lost a `Write` text that way, 261 characters against a stock 240. And
`alwaysLoadedChars` counts a text only for a tool the harness sends upfront, because a deferred
tool's text reaches no request until `ToolSearch` loads it, so counting it would overstate the
always-loaded total. Eight of the nine shipped texts are for upfront tools, and the shipped
always-loaded total is 5,570 characters that replace 8,710. The ninth is `SendMessage`, which the
harness defers, so `alwaysLoadedChars` leaves its 3,008 out.

No cost reading exists for these texts yet, which is the gate of the cost readings below: a shorter request is a saving
only when billed cost per finished task does not rise, and a tool description is also behavior, so
the next evidence for them is a task-set run and not a character count.

### The Baseline Has Drifted

Found on 2026-10-30 while re-reading the capture for the three new tool texts, and repaired the same
day. `just inventory` reported the `baseline` and the `deny list` totals stale by 192 characters each:
a default `bun tools/capture/run.ts` read the `plain` arm at 42,879 characters with a `system` of
5,954, against the 42,687 and the 5,764 that `plugins/claudetto/src/deny.ts` recorded from
2026-10-28.

What drifted is the third `system` block of the `plain` arm, which loads no plugin: it grew from 5,628
to 5,818 characters under an unchanged `2.1.312`, and those 190 raw characters cost 192 on the wire
once JSON escapes them. So the cause is the engine and nothing of this tree. `tools` held at 28,187
and `messages` at 8,061, so no other column moved.

Every row of `DENIED_TOOLS` and `DENIED_TOGETHER_TOTAL` carried the same offset, which is why the
`deny list` cut of `plugins/claudetto/src/cuts.ts` stayed right through the drift, 12,166 on both
dates: the subtraction cancelled it. `just check` passed throughout, because the identity
`BASELINE_TOTAL - shippedChars() === SHIPPED_TOTAL` tests arithmetic among recorded constants and
reads no capture. `just inventory` is the check that reads one, which is how it was found.

The repair re-read the totals: the baseline became 42,879 and the deny of
all three 30,713 (46,105 and 33,684 on `2.1.314`, as the tables above carry them). The drift was not absorbed into the `tool
texts` residual, which would have made that row claim 192 characters our texts never cut. It did
reach one row, for the same engine reason: `main agent body` moved from 67 to 259 under "Shipped Cuts
and Cost Readings" below, because the default body it replaces grew while the file did not.

### The Baseline Moved Again

Found on 2026-10-30 when the installed Claude Code went from `2.1.312` to `2.1.314` and `just inventory`
failed: the `baseline` row read 46,105 against 42,879 recorded, the `deny list` row 33,684 against
30,713, and the `shipped` row 31,356 against 31,959. This time the move is in `tools` and `messages`
and not in `system`, which held at 5,954: `tools` 28,187 to 29,512 (the `Agent` definition 4,850 to
5,246 and `Bash` 3,041 to 3,715), and `messages` 8,061 to 9,984. The cause is the engine and not this
tree, because the `plain` arm loads no plugin. Every row of `plugins/claudetto/src/deny.ts`,
`builtins.ts`, and `cuts.ts` was read again with `just capture` on `2.1.314`, and the repair is the
tables of this page. It reached `ScheduleWakeup` (4,631 to 4,886 characters), `agent listing` (480
to 662), `dedupe skill` (229 to 160), and the `tool texts` residual (3,144 to 7,154), which
"Shipped Cuts and Cost Readings" explains.

## The Two Switches

`plugins/claudetto/src/builtins.ts` writes two settings, and both ship, through `tierSnippet` and
through `shippedSettings` of the capture harness. `disableBundledSkills: true` takes the bundled skill
listing out of the request. `enabledPlugins` sets twelve built-in plugins to `false`:
`cc-plugin-<name>@builtin` for `agents-md`, `telemetry`, `plugin-authoring`, `mods-guide`, `tips`,
`mermaid`, `responsive-mode`, `diff`, `you-should-know`, `easel`, `claude-platform`, and
`claude-test`. The thirteenth built-in, `cc-plugin-sec-default`, is left alone on purpose: it declares
`enabledFromTrustedSettingsOnly` and `enabledFromPolicyOnly`, so a user `false` does not decide it
(`docs/gates.md:100`).

Read on 2026-10-30 with `bun tools/capture/run.ts` against a fake Messages API on `127.0.0.1`, so no
provider was reached and no model call was billed. First the `plain` arm, which loads no plugin:

| Settings of the run | Total | `system` | `tools` (count) | `messages` |
| --- | --- | --- | --- | --- |
| defaults | 46,105 | 5,954 | 29,512 (12) | 9,984 |
| deny of `Workflow`, `ScheduleWakeup`, `ReportFindings` | 33,684 | 5,954 | 17,091 (9) | 9,984 |
| `disableBundledSkills` alone | 57,134 | 5,954 | 46,467 (12) | 4,058 |
| `disableBundledSkills` with the deny of all three | 27,758 | 5,954 | 17,091 (9) | 4,058 |

Then the `plugin` arm of the shipped tree, with the `dedupe` skill in place, one switch at a time:

| Switches | Total | `system` | `tools` (count) | `messages` |
| --- | --- | --- | --- | --- |
| neither | 36,946 | 5,708 | 13,682 (9) | 16,874 |
| the twelve plugins off only | 36,678 | 5,708 | 13,682 (9) | 16,606 |
| the bundled-skill switch only | 31,624 | 5,708 | 13,682 (9) | 11,552 |
| both | 31,356 | 5,708 | 13,682 (9) | 11,284 |

What the rows settle:

- `disableBundledSkills` alone is a loss of 11,029 characters, 46,105 to 57,134. `Workflow` inlines the
  workflow guidance that its listing no longer carries, so `tools` grows 29,512 to 46,467 against a
  fall of 5,926 in `messages`. A lever that looks like a cut can be a loss on its own.
- With `Workflow` denied the growth has nowhere to land: `tools` is byte-identical at 17,091 in the
  third and fourth rows, and the whole 5,926 of `messages` is kept.
- In the shipped arm the two switches together take 5,590, every character of it out of `messages`,
  with `tools` at 13,682 and `system` at 5,708 in all four rows. The plugin block takes 268 alone and
  268 beside the other switch, and the bundled-skill switch 5,322. On `2.1.312` the block took 337
  beside the other switch, which was explained by `cc-plugin-claude-platform` offering its own
  `/claude-api` while no bundled skill held that name; that explanation is not supported by the
  `2.1.314` reading and was not tested again.
- Plugin skills survive the switch, which is the capability question. The installed claudetto of
  2026-10-30, which ships ten skills, was run on `2.1.312` against the fake API with and without the
  key. `claudetto:dedupe` and `claudetto:find-docs`, the two of the ten the model may call, are listed in
  both arms while every bundled name left, and the request fell 38,707 to 33,131, the same 5,576 that
  the other arms read then. That run was not taken again; the shipped arm of `2.1.314` lists
  `claudetto:dedupe` and `claudetto:setup` with the key on.
- The `dedupe` skill costs 160 characters of request, 31,196 with `skills/dedupe/` moved aside against
  31,356 with it in place. Counting its parts predicts 171: 6 for the name, 151 for the
  `description:` line, and 14 of markup. The measured figure is 11 lower, and the measurement is what
  this page states; it was 229 on `2.1.312`, 58 above the prediction.

## Compaction Keys

Read on 2026-10-28 against the installed Claude Code `2.1.312`, the version `claude --version`
reports and `claude` resolves to. Every row was found in that program with `cc-inspect surface`, and
`tests/claudetto/keys.test.ts` searches the program file itself for each key name and each chunk
name, so a key an upgrade renames fails the check instead of being written into settings for
nothing. The chunk names moved between `2.1.311` and `2.1.312`, from `chunk-7srfhct1.js:24753` for
`CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` in `references.md` to `chunk-017gw5jn.js:24856` here, so a pin is
per version and not forever.

| Key | Kind | Module | Offset | Value |
| --- | --- | --- | --- | --- |
| `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` | env | `chunk-017gw5jn.js` | 24856 | `50.0000` |
| `autoCompactWindow` | setting | `chunk-ce589w22.js` | 179258 | `300000` |
| `idleCompaction` | setting | `chunk-ce589w22.js` | 193028 | `false` |
| `CLAUDE_CODE_SLEEP_COMPACT` | env | `chunk-017gw5jn.js` | 33984 | unset |
| `CLAUDE_CODE_SLEEP_COMPACT_AFTER_MS` | env | `chunk-017gw5jn.js` | 34017 | unset |
| `CLAUDE_CODE_IDLE_COMPACT_MIN_TOKENS` | env | `chunk-017gw5jn.js` | 29918 | unset |
| `CLAUDE_CODE_AUTO_COMPACT_WINDOW` | env | `chunk-017gw5jn.js` | 26849 | unset |
| `autoCompactEnabled` | setting | `chunk-ce589w22.js` | 192754 | unset |
| `precomputeCompactionEnabled` | setting | `chunk-ce589w22.js` | 192858 | unset |

### The Shipped Combination

`just capture --shipped --tools 12` writes the settings of the new tree as one file, the deny list
beside the three written keys above and the two switches of "The Two Switches", and reads the first
request of a session with them. Read on 2026-10-30 on `2.1.314`:

| Arm | Total | Tools | System | Messages |
| --- | --- | --- | --- | --- |
| `plugin` | 31,356 | 13,682 (9) | 5,708 | 11,284 |

The three keys move the first request by 0 characters, read by removing `autoCompactWindow` and
`CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` together and `idleCompaction` alone, each of which reads 31,356
again. The `tools` array of this arm, 13,682, is the 12,919 of the tool-text reading plus the 832 of
the `sandbox` block, less the 69 that the `env` keys of `tierSnippet` take out, so no tool description
moves because of the compaction keys. The two columns that moved are not theirs. `system` is 5,708 here against the
5,954 of the `plain` arm because these settings also carry `agent: claudetto:main`, which puts the
body of `agents/main.md` where the default body stood, and `messages` is 11,284 here against the 11,490
of the tool-text reading above because they carry `outputStyle`, the `sandbox` block, and the `dedupe`
skill, and the two switches take 5,590 out. Each of those has its own row under "Shipped Cuts" below. That is the point
of reading the keys in the combination rather than alone: they are bill levers and not request levers,
and adding them to the snippet costs the prompt nothing. The `plugin` arm was 14,749 characters under
the 46,105 baseline of the `plain` arm at this reading, and is 14,066 under it, the sum of the inventory below, since the `docs` skill shipped.
This table is the whole shipped combination: `agents/main.md` under the `agent` key, the output style,
the handoff context block, the agent files, and the skills are all in it, which is why `system` and
`messages` moved. The arm read 30,462 on 2026-10-29 and 30,450 on the morning of 2026-10-30, and 31,959 on `2.1.312`
at the end of that day, and read 31,356 on `2.1.314` with two agent files, 31,968 with four, and reads 32,039 with the `docs` skill. The
section below on shipped cuts holds the reading per piece, and `just inventory` is what re-reads these
three totals against the figures the tree records.

### The Percentage and the Idle Keys

The threshold formula of `2.1.312` is `min(floor(E * pct / 100), E - 13000)`, where `E` is the window
in force less `min(maxOutputTokens, 20000)`: `nJ` at `chunk-r5cyd28m.js:1535742`, the effective
window `sQ` at `chunk-r5cyd28m.js:1541928`, and the 20,000 cap `XHr` at `chunk-r5cyd28m.js:1538038`.
`pct` is read from `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` and applies only while it is above 0 and at most
100; the harness's own field name for it is `testPctOverride`, so it is a test lever and its removal
in a later version is a real risk, which is what the pin test is for.

- `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` of `50.0000` with `autoCompactWindow` of `300000` puts the
  compaction at exactly 140,000 prompt tokens, the value `docs/evidence/compaction/threshold.md`
  measured at −14.2% of the bill, and the same percentage with the Haiku window of `200000` puts it
  at exactly 90,000, the trigger the `tier-profiles` spec needs to stay under the 100,000-token price
  step. Both are computed in `plugins/claudetto/src/threshold.ts` and checked in
  `plugins/claudetto/src/__tests__/threshold.spec.ts`, which also reproduces this login's old threshold of 224,999
  from its archived `80.3571`, the figure all 35 measured boundaries fired at. So the
  module is checked against 35 live firings and not against its own arithmetic alone. The new value
  moves the threshold down by 84,999 tokens.
- The first purpose of the key did lapse: the archived tree wrote it so that the handoff was written
  before the harness's summary request, and the new `session-handoff` spec writes from
  `classic.PreCompact`, which the harness awaits. The priced purpose stands, and it is the only key
  that moves the threshold without shortening the window the model may use. The documented
  alternative, `autoCompactWindow` of `173000` alone, reaches 140,000 through the `E - 13000` floor,
  but it also moves the harness's hard block to 150,000, which leaves 10,000 tokens of headroom above
  the trigger instead of 137,000. The block is `E - 3000` in the level function `EYe` at
  `chunk-r5cyd28m.js:1535967`, so it follows the window down. That is why the pair ships and the
  single setting does not.
- `idleCompaction` is written `false`. An idle compaction is a model request nobody waits for, and
  the one thing it buys is a small prompt after the cache has expired. On this login 2 of 8,702 gaps
  between requests exceed the `1h` cache lifetime, so it almost never buys that
  (`docs/evidence/compaction/threshold.md`). No request-size reading supports this key either way,
  because it changes no request text; the gap rows are its evidence.
- `CLAUDE_CODE_SLEEP_COMPACT` and `CLAUDE_CODE_SLEEP_COMPACT_AFTER_MS` stay unset on those same gap
  rows: sleep compaction is the same bet on a return after the cache lifetime, and the timer key only
  moves the moment of a compaction the tree does not turn on.
- `CLAUDE_CODE_IDLE_COMPACT_MIN_TOKENS` stays unset because it is the floor at which idle compaction
  applies, which is no lever while `idleCompaction` is `false`.
- `CLAUDE_CODE_AUTO_COMPACT_WINDOW` stays unset although it exists, because it sets one window for
  every model, and the Haiku row needs 200,000 beside the default 300,000. Only the per-model
  settings route gives that, so the two names are not alternatives here.
- `autoCompactEnabled` stays unset, and it is a dependency and not a lever. Auto-compact is on by
  default and the handoff of `session-handoff` hangs off the compaction the harness runs, so a user who
  turned it off gets no handoff. Claudetto keeps a value the user set, which makes that case a handoff
  decision and not a key to write here.
- `precomputeCompactionEnabled` stays unset and open. It builds the summary before it is needed,
  which is an extra model request unless the summary is used, and no reading prices it either way
  (`docs/levers.md`).

One limit of the whole set: the trigger is exactly 140,000 only while the model's output limit is at
least 20,000 tokens. A model whose limit is 8,192 would compact at 145,904 instead, because the
reserve is the smaller of the limit and 20,000. The 35 measured boundaries landed on the
20,000 reserve, so that is the case in force on this login.

The snippet above is the combination as of this section. The tier rows add their own keys, and the
two switches of "The Two Switches" ship beside it, through `tierSnippet`.

No billed-cost reading exists for the combination as one unit, which is the gate of the section below. The
threshold half of it is priced: the replay put 140,000 at −14.2% of the bill of real
sessions.

## Refused Keys

Ten keys are refused whatever a reading says they save, and `tests/claudetto/refused.test.ts` fails
on a snippet that holds any of them. The list is in `plugins/claudetto/src/refused.ts`, each row read
in the installed `2.1.312` on 2026-10-28, and the same test searches the program for every refused
name, so the list cannot rot into names the harness no longer has. "Not Touched, with the Reason"
below carries the same names from the `2.1.311` reading; these are their pins in the version the tree
is built against.

| Key | Kind | Module | Offset | What it would take away |
| --- | --- | --- | --- | --- |
| `disableAllHooks` | setting | `chunk-ce589w22.js` | 148137 | Every hook of every settings file and plugin, claudetto's own included |
| `disableSkillShellExecution` | setting | `chunk-ce589w22.js` | 150867 | The inline shell step of a skill or a custom slash command |
| `disableSideloadFlags` | setting | `chunk-ce589w22.js` | 163172 | `--plugin-dir`, `--plugin-url`, `--agents`, `--mcp-config`, which the lab and the capture both use |
| `disableCommandPluginSources` | setting | `chunk-ce589w22.js` | 162669 | The plugin source of slash commands, which is where claudetto's own come from |
| `DISABLE_LOGIN_COMMAND` | env | `chunk-017gw5jn.js` | 19131 | `/login`, gated by `!i.DISABLE_LOGIN_COMMAND` at `chunk-r5cyd28m.js:1721781` |
| `DISABLE_LOGOUT_COMMAND` | env | `chunk-017gw5jn.js` | 19160 | `/logout`, gated at `chunk-r5cyd28m.js:1722122` |
| `DISABLE_DOCTOR_COMMAND` | env | `chunk-017gw5jn.js` | 18899 | `/doctor`, gated at `chunk-ktc61wsq.js:162624` |
| `DISABLE_AUTOUPDATER` | env | `chunk-017gw5jn.js` | 18752 | The updater |
| `DISABLE_UPDATES` | env | `chunk-017gw5jn.js` | 19426 | The updater |
| `DISABLE_UPGRADE_COMMAND` | env | `chunk-017gw5jn.js` | 19449 | `/upgrade`, which is how the plan this whole budget is read against is changed |

The name alone is the fault, not the value. A refused key written `false` changes nothing, but a
snippet that names it is writing a key it has no reason to name, so the check reports it either way,
and a case covers that.

One distinction the check does not cover and a reader should not mistake. `tools/capture/run.ts` sets
`DISABLE_AUTOUPDATER`, `DISABLE_TELEMETRY`, and `DISABLE_ERROR_REPORTING` in the environment of the
`claude -p` child it spawns, so that a reading is not moved by an update or by traffic of its own.
That is one throwaway process of the measurement, with its own empty config folder; it writes nothing
into the user's settings, which is what the refusal is about.

## Shipped Cuts and Cost Readings

A shorter request is not a saving. The requirement this table serves cites a study that removed
38.4% of delivered tool-output tokens and raised billed cost by 6.8%, with a Pearson r of 0.15
between the two reductions (arXiv 2607.12161), so the character score and the bill are two
measurements and the bill is the one that decides. The inventory is
`plugins/claudetto/src/cuts.ts` and `tests/claudetto/cuts.test.ts` holds it to the capture: the
46,105 baseline less every cut in it has to equal the 32,039 the shipped arm reads, so a cut that
ships without a row breaks the check. That identity holds among three constants of one file, so it
catches a row that does not add up and not a tree that has moved away from all three; `just inventory`
is the check that re-reads each total from a capture, and it is the one that found the 12 characters,
the 192 characters, and then the 3,226 of drift above.

| Shipped cut | Characters off the first request | Cost reading |
| --- | --- | --- |
| Deny of `Workflow`, `ScheduleWakeup`, `ReportFindings` (`deny list`) | 12,421 | None exists yet |
| The residual of the eight upfront tool texts and the pieces no row names (`tool texts`) | 7,035 | None exists yet |
| `disableBundledSkills` with the twelve plugins off (`built-in surface`) | 5,590 | None exists yet. Plugin skills survive it, per "The Two Switches" |
| The `dedupe` skill | −160 | None needed. The model may call it |
| The `docs` skill, which runs the Context7 CLI `ctx7` | −71 | None needed. It stands in for the Context7 MCP server, which reads 907 (D35 of `openspec/changes/release-0-1-0/decisions.md`) |
| `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` with `autoCompactWindow` (`compaction pair`) | 0 | −14.2% of the bill at a 140,000 trigger, replayed over 3 sessions and 8,705 real requests (`docs/evidence/compaction/threshold.md`) |
| `idleCompaction: false` | 0 | None exists yet. Its evidence is the gap rows: 2 of 8,702 gaps exceed the `1h` cache TTL |
| `agents/main.md` under the `agent` key (`main agent body`) | 259 | None exists yet. A placebo run would price the prompt text |
| The plugin's own text in the third system block (`plugin system text`) | −38 | None needed. It is the host's, not ours |
| The agent listing of `Artemis`, `Athena`, `Hephaestus`, and `Hermes` | −1,155 | None needed. It is a listing the harness builds from each file's `description` and tools |
| The handoff context block of `src/handoff.ts` | −820 | None exists yet. A placebo run would price the prompt text |
| `output-styles/Concise.md` under the `outputStyle` key | −1,693 | None exists yet. A placebo run would price the prompt text |
| The `autoMode` lists | 0 | None exists yet. The classifier reads them, so the classifier call is where they are paid |
| The `sandbox` block | −7,254 | None exists yet. A sandboxed `Bash` call never pays a classifier call |
| The `/claudetto:setup` row in the command listing | −48 | None needed. It tells the model the command exists |

The rows sum to 14,066, which is 46,105 less the 32,039 of the shipped arm. A negative row is a piece
the tree adds.

Every figure above is a whole-request reading of one capture set of 2026-10-30 on `2.1.314`, so the
rows add up and each is the difference from the full arm rather than from the row before it: the arm
reads 31,356 with everything in place, 30,694 with `Artemis.md` and `Athena.md` moved aside, 29,663
with `output-styles/` moved aside, 29,001 with both of those moved aside, 31,615 with `agents/main.md`
moved aside, 31,308 with `commands/setup.md` moved aside, 31,196 with `skills/dedupe/` moved aside, and
24,102 without the `sandbox` block. The additivity is read and not assumed, since 662 plus 1,693 is the
2,355 that separates the full arm from the both-aside arm. Two of these rows moved when `just inventory`
was run on `2.1.314`, `agent listing` and `dedupe skill`, and the section above on the baseline says
why. Adding `Hephaestus` and `Hermes` later that day moved the arm to 31,968. It reads 31,475 with the
two files moved aside, so their listing costs 493, and the other 119 are the longer roster of the
`Agent` text, which falls in the `tool texts` residual. Adding the `docs` skill moved the arm to 32,039,
so its listing line costs 71.

The tool-text row is the one figure here that no isolating capture reaches, because hiding our tool
texts means hiding the plugin itself, so it is the residual of the shipped reading once every other
piece is measured, and it is a plug and not a measurement. On `2.1.314` it was 7,154 and no longer
the tool texts alone, and it is 7,035 since the roster grew. The split below is of the 7,154. The direct reading of the `tools` array puts the tool texts at 4,241, 17,091 in
the deny arm against 12,850 in the shipped arm without the `sandbox` block, which was 3,171 on
`2.1.312`. The other 2,913 are request text that no row of the table names: 646 in `messages` that the
keys of `tierSnippet` outside the table, such as `env` and `enableWorkflows`, cut once the deny list is
in place; 570 that `permissions.deny` cuts beyond the three names, 558 for the six `Agent(...)` rules
and 12 for `DesignSync`; and 1,697 not separated, because the two switches read 7,675 on the arm with
no `sandbox` block and 5,590 on the shipped one, so the pieces interact and a difference from the full
arm does not price them alone. The agreement of 27 characters between the direct reading and the
residual on `2.1.312` was a coincidence of two readings. A row for each named piece needs a row in
`tests/claudetto/cuts.test.ts`, which lists the rows by name. The instrument itself is deterministic
rather than noisy: three consecutive readings of the shipped arm in the morning of 2026-10-30, before
the tool texts, the switches, and the skill, gave 30,450 with `system`, `tools`, and `messages`
identical at 5,708, 13,009, and 11,029, and the plain and deny arms reproduced 42,687 and 30,521 to
the character. So the 12 characters between the two dates were a change of the tree and not a spread of
the instrument, and `just inventory` still allows 12 characters of slack per row, which is small
against the 1,382 of drift it was built to catch.

The body replaces the default body the plugin arm sends, so 5,572 characters stand where 5,856 stand,
and the request falls 259, not the 284 that the lengths alone give, because the body travels as a JSON
string and ours escapes characters the default text does not. The row was 67 against a default of
5,666 until the engine's drift: the default grew 5,666 to 5,856 while `agents/main.md` held at 5,572,
so the same file replaces 284 raw characters instead of 94 and earns 259 on the wire instead of 67.
The 5,856 is the plugin's default and the 5,818 of the `plain` arm is the host's, and the 38 between
them is the row above for the plugin's own system text. The agent listing is a cost rather than a free row:
`plugins/claudetto/src/blocks/agent-offer/block.ts` refuses the `agent.offer` for `claudetto:main`, a type no session
delegates to, but `Artemis`, `Athena`, `Hephaestus`, and `Hermes` are delegation targets, so the harness lists
all four with their descriptions and their tools, which reads 1,155 characters: 662 for the first two and 493 for
the other two. That row was 480 on `2.1.312` and 0 while `main` was the only
agent file in the tree. `docs/prompt/footprint.md` holds the readings and the `agent.offer` lever.

The style row is a cost and not a cut: the file's body of 1,526 characters enters `messages` under a
header, and the harness appends a reminder on each user message. Moving the folder aside reads 29,663
against 31,356, so the three together cost 1,693. The same pair read 1,705 on 2026-10-29, when the arm
stood 12 higher in `tools`, which is the fall of 12 the section above accounts for.

One of the fourteen shipped rows is priced, and it is the one that moves no request text. The eleven
that move text come to 14,137 characters off the baseline, and they are unpriced: a shorter request and
not a saving until a task-set run prices them. The deny list is also
a capability cut, which the section on the deny list states per name, and a tool description is behavior, so
for both of them the next evidence is a finished-task run and not a character count.

What a cost reading has to be, so that a later task does not weaken the gate: billed cost per
finished task, from `$.session.usage()` deltas or from the plan's own usage lines, over the same task
set with and without the cut. The threshold row above is the nearest thing the tree has, and its own
limit is written on its page: it is a replay of real sessions priced at published rates, checked
against a measured bill of `$230.64` with a predicted `$212.07`, not a controlled run of the same
tasks twice. A cut whose reading shows the bill rising is reverted, which is what `risingCuts`
reports, and it is empty in the shipped tree.

## Measured: Settings against Request Size

| Settings of the run | Total JSON chars | Tools | `tools` chars | `messages` chars |
| --- | --- | --- | --- | --- |
| `{}` | 42,676 | 12 | 28,187 | 8,095 |
| `disableBundledSkills: true` | 54,055 | 12 | 45,142 | 2,519 |
| `enableWorkflows: false` | 37,066 | 11 | 22,831 | 7,841 |
| `disableWorkflows: true` | 37,066 | 11 | 22,831 | 7,841 |
| `deny` of `Workflow`, `ScheduleWakeup`, `ReportFindings` | 30,510 | 9 | 16,021 | 8,095 |
| the row above plus `disableBundledSkills: true` | 24,934 | 9 | 16,021 | 2,519 |
| `disableBundledSkills`, `disableWorkflows`, `deny` of those three plus `Agent` and `ListAgents` | 18,191 | 7 | 10,018 | 1,779 |

The `system` array held 3 blocks and 5,719 characters in every one of the seven runs, so each difference above is tool definitions and message text, not the system prompt.

### What the Rows Settle

- A `permissions.deny` entry for a tool name removes that tool's whole definition from the request. The three denied names took 12,166 characters of the first row, and the row with the deny shows the same `system` and the same `messages` as the first row. So a deny is a request-size lever and not only a gate.
- `disableBundledSkills: true` on its own made the request **larger**, 42,676 to 54,055 characters. The `Workflow` tool definition grew from 5,355 to 22,310 characters while `messages` fell from 8,095 to 2,519. So this key is a saving only together with the removal of `Workflow`, where the pair gives 42,676 to 24,934. A lever that looks like a cut can be a loss on its own, which is why every row here is measured.
- `enableWorkflows: false` and `disableWorkflows: true` produced byte-identical totals, 37,066, with the same 11 tools. Both remove only the `Workflow` definition and 254 characters of `messages`. The pre-restart snippet set `enableWorkflows: false`; the new tree writes no such key and removes the `Workflow` definition through its deny list (`plugins/claudetto/src/deny.ts:35`). Either way the definition is already gone, so adding `disableWorkflows` changes nothing in the request. It may still change the cloud behavior its description names, which this probe does not read.
- The largest trim measured cut the first request from 42,676 to 18,191 characters, 57.4% less. Of that, denying `Agent` and `ListAgents` is 6,001 characters and it removes subagents, so it is a capability loss and belongs only to a tier row that rows of `window-budget` support.
- `ToolSearch` was in the request in all seven runs with `DeferredToolPlaceholder` beside it, so the other built-in tools were already deferred and not in the request. The deferral, not our text, is what keeps the resident tool set at 12 here.

### The Resident Tools after the Trim

From the last row: `Bash` 3,041, `Read` 1,919, `Skill` 1,803, `ToolSearch` 1,440, `Edit` 964, `Write` 639, `DeferredToolPlaceholder` 204 characters.
From the first row, the three that the deny removed: `Workflow` 5,355, `ScheduleWakeup` 4,631, `ReportFindings` 2,177. The two that the last row also removed: `Agent` 4,850, `ListAgents` 1,151.

## Already Set by the Setup Snippet

Read from the setup snippet of the pre-restart plugin, which this tree no longer holds. The tier snippet of the new tree (`plugins/claudetto/src/tiers/snippet.ts:36`) writes only the keys of a tier row, and the deny list (`plugins/claudetto/src/deny.ts:34`) holds three names, so the keys below are a record of what the pre-restart snippet set and not of what the new tree writes. Each was a measurement row away from needing no new work.

Settings: `syncClaudeAiSkills: false`, `syncClaudeAiPlugins: false`, `disableClaudeAiConnectors: true`, `disableBundledSkills: true`, `disableAgentView: true`, `disableRemoteControl: true`, `enableArtifact: false`, `enableWorkflows: false`, `spinnerTipsEnabled: false`, `promptSuggestionEnabled: false`, `awaySummaryEnabled: false`, `autoMemoryEnabled: false`, `autoDreamEnabled: false`, `idleCompaction: false`, `feedbackDrafts: "off"`, `modelProposedGoals: "disabled"`, and twelve built-in plugins set to `false` in `enabledPlugins`.

Env: `ENABLE_CLAUDEAI_MCP_SERVERS=false`, `CLAUDE_CODE_DISABLE_ADVISOR_TOOL`, `CLAUDE_CODE_DISABLE_CRON`, `CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY`, `CLAUDE_CODE_DISABLE_TERMINAL_TITLE`, `CLAUDE_CODE_DISABLE_CFC_PROMPT`, `CLAUDE_CODE_AUTO_CONNECT_IDE=false`, `CLAUDE_CODE_IDE_SKIP_AUTO_INSTALL`, `DISABLE_ERROR_REPORTING`, `DISABLE_EXTRA_USAGE_COMMAND`, `DISABLE_FEEDBACK_COMMAND`, `DISABLE_INSTALL_GITHUB_APP_COMMAND`.

Deny of a non-CLI tool: `Artifact`, `DesignSync`, `RemoteTrigger`, `Workflow`, `ScheduleWakeup`, `ReportFindings`, `TaskCreate`, `TaskGet`, `TaskList`, `TaskUpdate`, `mcp__computer-use`.

## Candidates Not Yet Set, Each Verified In `2.1.311`

Each name below was listed by `cc-inspect` `surface` for the installed version, with the module and offset given. None is adopted here. Each is to be measured with the probe above, and only the ones with a reading are to be added.

Settings, module `chunk-z1xn9dp7.js`: `workflowKeywordTriggerEnabled` (`:152021`, the "ultracode" keyword trigger), `channelsEnabled` (`:185759`, inbound channel messages from MCP servers), `voiceEnabled` (`:98163`, hold-to-talk dictation, gated), `agentPushNotifEnabled` (`:197989`) and `inputNeededNotifEnabled` (`:197871`, both mobile push), `disableDeepLinkRegistration` (`:97994`, the `claude-cli://` OS handler, gated), `disableArtifact` (`:150888`, marked deprecated in favor of `enableArtifact: false`, which the snippet already sets).

Env, module `chunk-7srfhct1.js`: `CLAUDE_CODE_DISABLE_ARTIFACT` (`:9363`), `CLAUDE_CODE_DISABLE_WORKFLOWS` (`:12128`), `CLAUDE_CODE_DISABLE_WORKING_SYNC` (`:28299`) and `CLAUDE_CODE_DISABLE_WORKING_SYNC_WATCH` (`:28339`), `CLAUDE_CODE_DISABLE_CLAUDE_API_SKILL` (`:9937`) and `CLAUDE_CODE_DISABLE_CLAUDE_CODE_SKILL` (`:9981`), `CLAUDE_CODE_DISABLE_POLICY_SKILLS` (`:11471`), `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` (`:11120`), `CLAUDE_CODE_DISABLE_OFFICIAL_MARKETPLACE_AUTOINSTALL` (`:11272`), `CLAUDE_CODE_DISABLE_PROACTIVITY` (`:11605`), `CLAUDE_CODE_DISABLE_ORG_MEMORY` (`:11332`), `CLAUDE_CODE_DISABLE_LAUNCH_COMPOSER` (`:10516`), `DISABLE_TELEMETRY` (`:19298`), `DISABLE_GROWTHBOOK` (`:18924`), `DISABLE_BUG_COMMAND` (`:18740`).

A `surface` listing of the installed version gives 123 environment variables whose name holds `DISABLE` and 14 settings whose name holds `disable`, so the list above is a selection by the CLI-only rule, not the whole set.

Two of the environment variables above are per-skill levers, `CLAUDE_CODE_DISABLE_CLAUDE_API_SKILL` and `CLAUDE_CODE_DISABLE_CLAUDE_CODE_SKILL`. The user dropped `claude-api` on 2026-10-27, and the skills listing above prices it at `361` tokens, the second largest row. So at least one named skill can be dropped without taking the whole listing. Whether a lever exists for each of the other five the user dropped is unread.

### Fast Mode, Adopted Off

The user ruled on 2026-10-27: "fast mode also gets disabled! speed is not our concern. too many tokens it consumes. if something costs too many tokens and usage, it either gets trimmed, or dropped."

Two switches exist, both read from the installed `2.1.311`. The setting is `fastMode`, described as "When true, fast mode is enabled. When absent or false, fast mode is off." (`chunk-z1xn9dp7.js:180800`). A companion setting `fastModePerSessionOptIn` is described as "When true, fast mode does not persist across sessions. Each session starts with fast mode off." (`chunk-z1xn9dp7.js:180913`). The environment variable is `CLAUDE_CODE_DISABLE_FAST_MODE`, a boolean (`chunk-7srfhct1.js:39244`).

Fast mode is already off when the setting is absent, so `fastMode: false` changes nothing for a fresh user. It matters for a user who has pressed `/fast` before, because the second setting's description implies the choice persists across sessions by default. So setup writes both: `fastMode: false` to clear a stored opt-in, and `CLAUDE_CODE_DISABLE_FAST_MODE=1` so the `/fast` toggle cannot turn it back on inside a claudetto session.

The size of the saving is not the point here and is not claimed. The user's reason is token spend: the prompt describes fast mode as using Opus with faster output, so a session in fast mode is an Opus session. Its only prompt-text cost is the `138`-character sentence in the body, which the body replacement removes anyway.

### One More Candidate, with a Measured Size

`includeGitInstructions: false` in `settings.json`, or `CLAUDE_CODE_DISABLE_GIT_INSTRUCTIONS=1`, takes the lean default from `15,721` to `15,083` characters of prompt text, a saving of `638` (`cc-docs read prompts/git-instructions-off`, recorded with the other variants in `docs/prompt/variants.md`). The page notes that the git status reminder stays, and that the commit and pull request rules live in the `Bash` tool text, so that text changes.

Adopted. The user ruled on it on 2026-10-27: "this is a win. it has nothing to do with real coding, thus unnecessary. claudetto is *specifically* optimised for *coding*". What it removes is the harness's own commit and pull request prose, including the attribution lines, which is not coding work. So this is a decision and not an open trade, and the key is written rather than weighed.

The full variant table, with the switch and size of every documented prompt shape, is in `docs/prompt/variants.md`. It is not repeated here. The one fact worth stating twice: `autoMemoryEnabled: false`, which the snippet already writes, is the largest single prompt-text saving the docs measure, at `2,063` characters, so that win is already banked.

## The Whole `disable` and `enable` Settings Listing Of `2.1.312`

Read on 2026-10-28 in the installed `2.1.312`, with `cc-inspect` `surface` `setting`. The install moved from `2.1.311` to `2.1.312` on 2026-10-27, so every module name in this section is a `2.1.312` name and does not match the `2.1.311` names above. A `chunk-*.js` name is per build, so the name itself says which install a row was read in.

The listing gives 14 settings whose name holds `disable` and 25 whose name holds `enable`. All 39 are accounted for below, so no name in the listing is left without a line. Every one of the 39 sits in one module, `chunk-ce589w22.js`.

Of the 39, the sections above already carry 23: eleven that the setup snippet writes (`disableClaudeAiConnectors`, `disableBundledSkills`, `disableAgentView`, `disableRemoteControl`, `enableArtifact`, `enableWorkflows`, `spinnerTipsEnabled`, `promptSuggestionEnabled`, `awaySummaryEnabled`, `autoMemoryEnabled`, `autoDreamEnabled`), `enabledPlugins`, which the snippet writes for its twelve built-in plugins, seven in "Candidates Not Yet Set" (`workflowKeywordTriggerEnabled`, `channelsEnabled`, `voiceEnabled`, `agentPushNotifEnabled`, `inputNeededNotifEnabled`, `disableDeepLinkRegistration`, `disableArtifact`), and four in "Not Touched" (`disableAllHooks`, `disableSkillShellExecution`, `disableSideloadFlags`, `disableCommandPluginSources`).

The remaining 16 had no line anywhere in this page. Three are candidates and thirteen are not. A fourth candidate, `bashOutputMaxChars`, is in the candidate table below although it is not one of the 16 and not in the listing at all, because the reading turned it up in the same object. Each row below gives the module and offset of its description, which is the source line.

### The Four New Candidates

| Key | Offset | What the program says, and why it is a candidate |
| --- | --- | --- |
| `precomputeCompactionEnabled` | `chunk-ce589w22.js:192858` | "Precompute the compaction summary in the background before it is needed. Only applies when auto-compact is on." It defaults to on: `function SWr(){return Ks("precomputeCompactionEnabled",!0).value}` (`chunk-452kr8jw.js:1252`), and the settings row shows `value: r?.precomputeCompactionEnabled ?? !0` (`chunk-0d2nk7sh.js:21753`). It is the only key of the 39 that can spend a model call the session never uses. The spend needs four conditions together, `wGe(){if(!cp())return!1;if(!NF())return!1;if(!k("tengu_sepia_moth",!1))return!1;return SWr()}` (`chunk-r5cyd28m.js:2436138`), so auto-compact on, the remote swap supported, the GrowthBook gate `tengu_sepia_moth` on, and this key on. Turning auto-compact off already stops it, which the handover path does, so the key is insurance and not the main lever. |
| `bashEditDiffEnabled` | `chunk-ce589w22.js:151259` | "Whether the Bash tool shows a diff of the files a Bash command changed (`PostToolUse` Bash hooks get the changed-file list in `tool_response`). Set to false to turn that off. Default: on when the Bash tool handles file edits." A diff of changed files is tool output that reaches the model, so it is context we pay for. CAUTION before adopting: the same sentence says the changed-file list arrives in `tool_response` for `PostToolUse` Bash hooks, and this plugin registers `work.bash-*` hooks, so turning it off may take a field those hooks read. Measure the hooks first. |
| `disableWorkflows` | `chunk-ce589w22.js:148824` | The snippet already writes `enableWorkflows: false`, and this is a second, separate key. Its own description says Code Review on pull requests and `/ultrareview` "run in Anthropic's cloud and are not stopped by this setting", and that `CLAUDE_CODE_DISABLE_WORKFLOWS` set in the environment before start does disable Workflows. A user-settings value does count in the gate: `let o=e&&!i.CLAUDE_CODE_DISABLE_WORKFLOWS&&Ks("disableWorkflows",!1).source==="userSettings"` in `c4o()`, the function behind the `Workflow` tool's `isEnabled`. So the pair to write is the environment variable, with the setting as the local record. |
| `bashOutputMaxChars` | `chunk-ce589w22.js:151259` | Found while reading `bashEditDiffEnabled`, which sits in the same object. Not a `disable` or `enable` name, so it is outside that list, and it is recorded here because it is the largest plain context lever this reading turned up: "How many characters of a successful `Bash` or `PowerShell` command's output Claude receives inline (default 30000; values clamp to 4000-128000). Output past this is saved to a file and Claude receives a short preview plus the path." A lower cap is a per-call cut of tool output, and the overflow still reaches Claude as a path, so nothing is lost outright. It belongs in the tier rows once a reading prices it. |

### The Thirteen That Are Not Candidates, Each with Its Reason

| Key | Offset | Why not |
| --- | --- | --- |
| `todoFeatureEnabled` | `chunk-ce589w22.js:194310` | "Enable the todo / task tracking panel", a legacy global config key with the default `true` (`chunk-3xe0k172.js:86801`). It does not gate the `TodoWrite` tool. That gate is `isEnabled(){return!gM()&&Y3()}` with `function gM(){if(i.CLAUDE_CODE_ENABLE_TASKS===!1)return!1;return!0}`, so `!gM()` is false and the tool is off by the program's own gate unless `CLAUDE_CODE_ENABLE_TASKS` is set to false (`surface` `tool-gates`, module `chunk-13f3hezx.js`). The setting changes the panel the user sees, which is CLI. |
| `disableAutoMode` | `chunk-ce589w22.js:188759` | "Disable auto mode". The project adopts auto mode, which is the `auto-mode` capability. |
| `disabledMcpjsonServers` | `chunk-ce589w22.js:143620` | "List of rejected MCP servers from `.mcp.json`". A list of names, not a switch for a surface. |
| `enabledMcpjsonServers` | `chunk-ce589w22.js:143520` | "List of approved MCP servers from `.mcp.json`". The same, in the other direction. |
| `enableAllProjectMcpServers` | `chunk-ce589w22.js:143398` | "Whether to automatically approve all MCP servers in the project". Writing it on would approve a server nobody read, which is the opposite of the gate's purpose. It stays unset, which is its default. |
| `syntaxHighlightingDisabled` | `chunk-ce589w22.js:174181` | "Whether to disable syntax highlighting in diffs". What the user sees in the terminal. |
| `autoScrollEnabled` | `chunk-ce589w22.js:193642` | "Auto-scroll the conversation view to bottom (fullscreen mode only)". The same. |
| `wheelScrollAccelerationEnabled` | `chunk-ce589w22.js:193758` | "Ramp mouse-wheel scroll speed during fast scrolls (fullscreen mode only)". The same. |
| `terminalProgressBarEnabled` | `chunk-ce589w22.js:194197` | "Emit OSC 9;4 progress sequences during long operations". The same. |
| `emojiCompletionEnabled` | `chunk-ce589w22.js:179836` | The `:emoji:` typeahead. The same. |
| `fileCheckpointingEnabled` | `chunk-ce589w22.js:193893` | "Snapshot files before edits so `/rewind` can restore them", default `true` (`chunk-3xe0k172.js:86801`). It costs disk, not prompt text, and it is the user's way back from a bad edit. |
| `alwaysThinkingEnabled` | `chunk-ce589w22.js:176945` | "When false, thinking is disabled. When absent or true, thinking is enabled automatically for supported models." This is the effort and thinking question, not a non-CLI surface, and the rule is that a disabled thinking mode above effort `high` is a 400 on `claude-haiku-5-5`. |
| `autoCompactEnabled` | `chunk-ce589w22.js:192754` | "Automatically compact conversation when context fills", default on through `function cp(){if(t())return!1;return Ks("autoCompactEnabled",!0).value}`, where `t()` is true when `DISABLE_COMPACT` or `DISABLE_AUTO_COMPACT` is set (`chunk-452kr8jw.js:1252`). It is the subject of the `compaction-path` capability, so the probe decides it and this page does not. |

The arithmetic of the 39 is: 23 already on this page, 3 new candidates, because `bashOutputMaxChars` is not in the listing, and 13 non-candidates. 23 plus 3 plus 13 is 39.

## `cc-plugin-responsive-mode`, Priced at Zero

Read on 2026-10-28 in the installed `2.1.312` with `cc-inspect` `code`. The dossier said this built-in plugin injects a 396-character reminder on every prompt, which would fight the concise output style of `plugins/claudetto/output-styles/Concise.md`. It injects two texts, not one, and it costs nothing today, because it is off by default and unavailable without a server gate. So no setup entry and no tier row is needed for it, and a golf reading on and off cannot differ on this machine.

| Export | Characters | Where it enters the request | Offsets |
| --- | --- | --- | --- |
| `REMINDER`, the `u` template | 391 | `on("prompt.submit", ...)` appends it to `context`, on each prompt the person typed (`typedByTheUser`) | content `chunk-535bwx0f.js:6331` to `:6721`, the declaration at `:6324` and the next statement at `:6723` |
| `SECTION`, the `m` template | 2,247 | `on("prompt.section", { name: "focus_mode" }, ...)` returns it when the harness's own text for that section is `null`, so it joins the system prompt | content `chunk-535bwx0f.js:6731` to `:8977`, the next statement at `:8969` |

The character counts are the distance between the two offsets of each template literal, read with `cc-inspect` `code` `search` on the literal's own opening and closing text, and not a count of re-typed text. The dossier's 396 is 5 too high, and it names only the smaller of the two texts.

Why it costs nothing: `var qFn={name:"cc-plugin-responsive-mode",...,isAvailable:qho,defaultEnabled:!1}` and `var qho=()=>H$()&&!Yxt()&&An("tengu_quiet_ember",Kho())` with `var Kho=()=>!1` (`chunk-f5991pc6.js:1007-1062`). So three conditions must hold together: the GrowthBook gate `tengu_quiet_ember`, whose local default is `false`, an interactive session, since `H$()` is false for `CLAUDE_CODE_SESSION_KIND` of `bg`, `daemon`, or `daemon-worker` (`chunk-4t3x8zky.js:6990`), and a person turning the plugin on, since `defaultEnabled` is false. Not read: what `Yxt()` tests.

The registration itself is unconditional enough to note: `chunk-cq1tyg5c.js:1647` loads the module when `CLAUDE_CODE_ENTRYPOINT !== "local-agent"` and `!pEe()`, or when `Og() === "remote"`. Loading is not injecting, and neither text reaches a request while `isAvailable` is false.

One behavior to keep in view if the gate ever opens: the same `prompt.submit` hook calls `$.turn.abort({turnId})` when `cutsTheTurn` holds, so the framework can end the turn the person just typed into.

## Not Touched, with the Reason

- `disableAllHooks`, `disableSkillShellExecution`, `disableSideloadFlags`, `disableCommandPluginSources`: each one would stop claudetto itself, since the framework is hooks, skills, and a sideloaded plugin directory.
- `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS`: the framework uses background runs and `Monitor`.
- `CLAUDE_CODE_DISABLE_ATTACHMENTS`, `CLAUDE_CODE_DISABLE_FILE_MENTIONS`: these are TUI features that the user types, `@file` among them, so they are part of the CLI and not a non-CLI surface.
- `DISABLE_AUTOUPDATER`, `DISABLE_UPDATES`, `DISABLE_DOCTOR_COMMAND`, `DISABLE_LOGIN_COMMAND`, `DISABLE_LOGOUT_COMMAND`, `DISABLE_UPGRADE_COMMAND`: these take away a command the user needs to run the CLI, so setup does not write them.
- `DISABLE_PROMPT_CACHING` and its per-model forms: a cache read is the cheapest input there is, so turning caching off raises cost. Not a trim.

## Tools Seen in the Listing but Not in Any Request

The `surface` `tool` listing of `2.1.311` gives 89 tools. The probe requests held at most 12, so the rest were deferred, gated off, or absent for lack of a login. These are the non-CLI ones to look for in a reading on the real login, and to deny when they appear: `AppifactRepl`, `ArtifactCheck`, `ArtifactComments`, `ArtifactData`, `ClaudeDesign`, `CronCreate`, `CronDelete`, `CronList`, `FetchInboxMessage`, `ListConnectors`, `OfferChromeSetup`, `Poll`, `Projects`, `PublishPlugin`, `PushNotification`, `ReadNotifications`, `SearchMcpRegistry`, `SendFeedback`, `SendFile`, `SendUserFile`, `SendUserMessage`, `ShareOnboardingGuide`, `ShowOnboardingRolePicker`, `SuggestConnectors`, `SuggestPluginInstall`, `SuggestSkills`, `enable__mcp__claude-in-chrome`, `enable__mcp__remote-devices__Claude_Browser`, `enable__mcp__remote-devices__computer`, `memory_list`, `memory_read`, `memory_write`, `propose_skills`, `request_computer`.

A deny of a name that the request does not carry costs nothing and saves nothing, so the list grows only from a reading, not from the listing.

## The Docs' Own Token Table, Which Corroborates Ours

Read on 2026-10-27 with `cc-docs read how-it-works/context-budget --section "What Each Tool Costs"`. Its method differs from ours: it removes one tool at a time with `--disallowedTools` and reads the new total of an empty session, which starts at `12,524` tokens. Ours denies tools in settings and counts characters in a captured request body. Two methods, two units, and they agree where they overlap.

| Removed | New total | Change | Note from the page |
| --- | --- | --- | --- |
| `Workflow` | 10,555 | -1,969 | |
| `ScheduleWakeup` | 10,849 | -1,675 | |
| `Agent` | 11,204 | -1,320 | |
| `ReportFindings` | 11,717 | -807 | |
| `Read` | 11,818 | -706 | |
| `ListAgents` | 12,179 | -345 | |
| `Edit` | 12,184 | -340 | |
| `Write` | 12,294 | -230 | |
| `Bash` | 12,908 | +384 | "The program adds `Glob` and `Grep` in its place" |
| `Skill` | 18,123 | +5,599 | `Workflow` grows from `5,313` to `22,089` characters |
| `ToolSearch` | 28,422 | +15,898 | "Every deferred tool loads (deferred 0, tools 23,781)" |
| `WebSearch`, deferred | 12,394 | -130 | the deferred pool goes from `13,425` to `13,190` |

The page warns that its own system prompt line "moved between 2,277 and 2,427 across these runs", so each Change carries 10 to 20 tokens of noise.

### What This Adds to Our Own Reading

The `Skill` row is the corroboration that matters. The page reports `Workflow` growing from `5,313` to `22,089` characters when `Skill` goes. Our own probe measured `Workflow` at `5,355` characters in a plain run and `22,310` with `disableBundledSkills: true`. Two independent captures, the same swell, a gap of under one percent. So the mechanism is settled and not a quirk of our harness: when no `Skill` tool can load `workflow-authoring`, the program moves that guidance into the `Workflow` tool text.

Three penalties the page measures and our probe never tested. Removing `ToolSearch` costs `+15,898` tokens, because every deferred tool then loads. Removing `Skill` costs `+5,599`. Removing `Bash` costs `+384`, because the program substitutes `Glob` and `Grep`. So three plausible trims are losses, and none of the three goes in a deny list. On `2.1.314` our own capture reads `Bash` the other way, 407 characters under the baseline ("The Baseline Moved Again" above). `Bash` stays on `NEVER_DENY` because the deny removes the shell, and that saving does not pay for the capability.

The deferred pool is `13,425` tokens that the default session does not pay. That is the single largest saving in the program, and `DeferredToolPlaceholder` with `ToolSearch` is what holds it open.

### The Skills Listing, per Skill

`Skill` brings the listing of the built-in skills, `2,210` tokens in total:

| Skill | Tokens |
| --- | --- |
| `dataviz` | 482 |
| `claude-api` | 361 |
| `code-review` | 331 |
| `update-config` | 236 |
| `schedule` | 127 |
| `run` | 123 |
| `loop` | 115 |
| `plugin-authoring` | 89 |
| `workflow-authoring` | 84 |
| `keybindings-help` | 83 |
| `fewer-permission-prompts` | 64 |
| `simplify` | 63 |
| `security-review` | 30 |
| `init` | 22 |

The user ruled six of these dropped on 2026-10-27: `claude-api`, `code-review`, `loop`, `simplify`, `security-review`, and `init`. Their rows sum to `922` tokens of the `2,210`, leaving `1,288`. The six are already dropped from the model's view, because the snippet's `disableBundledSkills: true` takes the whole `2,210`, as the next subsection shows from the program. So the `922` figure is bookkeeping, not a pending win. The combination row above is the one that pays: a deny of `Workflow`, `ScheduleWakeup`, and `ReportFindings` plus `disableBundledSkills: true` is `24,934` characters against `30,510` for the deny alone, a saving of `5,576`.

The per-skill lever exists and is documented. `skillOverrides` "Sets the visibility of each skill", with the values `on`, `name-only`, `user-invocable-only`, and `off`, and the page adds that "Plugin skills are not affected" (`cc-docs read extend/skills-and-commands`, section "Loading and Controls", read 2026-10-27). A second page calls it "Hide or collapse a skill without editing its SKILL.md" and says it is allowed in any settings file (`configure/settings/hooks-and-plugins`).

These read as two routes to the same place. They are not, and the snippet is on the better one but is `257` characters short of the best. Measured on 2026-10-27, eleven runs, with the method of "The Probe, Kept Verbatim" below. Every row denies `Workflow`, `ScheduleWakeup`, and `ReportFindings`, as the deny list of the new tree does (`plugins/claudetto/src/deny.ts:35-37`). `pa` is `plugin-authoring`. The config folder and the work folder were emptied before each run, so no row carries a prior session.

| Settings beside the deny | Total | `messages` | Against the deny alone |
| --- | --- | --- | --- |
| none | 30,510 | 8,095 | 0 |
| `pa: "name-only"` | 30,262 | 7,847 | −248 |
| six bundled skills `off` | 28,229 | 5,814 | −2,281 |
| `disableBundledSkills: true` | 24,934 | 2,519 | −5,576 |
| the switch, plus the six `off` | 24,934 | 2,519 | −5,576 |
| the switch, plus `pa: "name-only"` | 24,686 | 2,271 | −5,824 |
| the switch, plus `pa: "off"` | 24,429 | 2,182 | −6,081 |
| the switch, plus `pa: "user-invocable-only"` | 24,429 | 2,182 | −6,081 |
| the switch, plus `pa: "off"` and the six `off` | 24,429 | 2,182 | −6,081 |
| the switch, `pa: "user-invocable-only"`, and a deny of `Skill` | 22,625 | 2,182 | −7,885 |

The deny-alone `30,510` and the switch row `24,934` reproduce the two figures this file already recorded, which is the check that the probe was rebuilt correctly.

Four findings, in order of what they change:

- `disableBundledSkills: true` wins the whole `2,210`-token listing, and the six per-skill `off` entries win `2,281` characters alone. Beside the switch they win nothing, `24,934` both times. So the user's six drops are already delivered by line 145, and they need no new setting.
- One skill survives the switch. A dump of the request of the switch row shows the skills listing down to a single entry, `plugin-authoring`, with its full description. Nothing else is left.
- So the snippet's `skillOverrides: {"plugin-authoring": "name-only"}` (`:144`) is live, not dead. It wins `248` characters, both with the switch and without it.
- `name-only` is the weakest of the three values that do anything here. `user-invocable-only` wins `505`, and `off` wins the same `505`. They tie, so `user-invocable-only` is the one to take, because it hides the entry from the model and still leaves `/plugin-authoring` typable for the user, which `off` removes. Against the shipped `name-only` that is `257` characters per request for no loss.

A note on how this section was wrong twice, because the plan rested on it both times. It first said the per-skill route "may give most of the saving with none of the swell" and was "the one to measure first". The measurement says the switch beats it by `3,295` characters. It then said, from a program read alone, that line 144 was dead, reasoning that `p9r(e,t)` (`chunk-n4f3rrna.js:1206`) plus the `DCe()` line

```js
let n=ft(),r=Fje(e)??"on";if(p9r(e,n))return r==="off"?"off":"user-invocable-only";return r
```

forces every killed skill to `user-invocable-only` unless its override is exactly `off`. That reading is sound, and it does not apply, because `p9r()` also requires `e.source === "builtin"`, and `plugin-authoring` reaches this session from a built-in plugin instead. The switch never touches it, so its override is read in full. The lesson for the rest of this file: a program read bounds what can happen, and only a capture says what does.

The program sets one more bound that the docs page does not state, and it decides whether the six `off` entries can work at all. `DCe()` in `chunk-2ht8z368.js` at offset `947185` of `2.1.311` returns `"on"` for any command whose `type` is not `"prompt"`, and reads `skillOverrides` only for a `"prompt"` command, with one exception by name, `auto-mode-setup`, which is of type `local` or `local-jsx`. The program's own error text, at offset `3181007`, names the excluded cases: "is a UI command, not a skill" for `local-jsx`, and "is a built-in CLI command, not a skill" for `local`. Both `/init` (`chunk-2ht8z368.js:1698687`) and `/security-review` (`chunk-2ht8z368.js:1738046`) are of type `prompt`, so an `off` entry does reach each of them. Read on 2026-10-27. This closes a doubt raised while writing the dossier pages, where a page said `/init` was "a command and not a skill", which the bundled-skills table also suggests, since it has no `/init` row. The token table above is the better evidence, because it prices `/init` inside the skills listing, and the program agrees.

The measured rows also correct the docs sentence "Plugin skills are not affected". `plugin-authoring` survives `disableBundledSkills: true`, which marks it as something other than a bundled skill in this session, and its `skillOverrides` entry still moves the request by `248` or `505` characters. So the sentence does not hold for whatever kind this skill is. The ranking the program uses is `gC = {on: 0, "name-only": 1, "user-invocable-only": 2, off: 3}` (`chunk-2ht8z368.js:944170`), and the measurement matches it: a higher rank hides more, and the top two tie because both hide the entry from the model.

What claudetto's own skills cost is not in these rows, because the probe ran with an empty config folder in `/tmp/stubwork`, so claudetto was not installed for any of the eleven runs. Their cost has to be measured in a run that installs the plugin, which task `14.1` can add once the probe has a home in the repo. Until then, assume the docs sentence holds for them and golf the ten `description:` lines in the files themselves, `1,720` bytes in total.

### The Three System Blocks, and Why `5,699` and `5,627` Never Disagreed

The plan carried an open item: the docs give `5,699` "System Characters" for `claude-opus-5-5` (`cc-docs read how-it-works/system-prompt`, section "Prompt by Model"), our capture gave `5,627`, and the `72` between them was unexplained. The eleven runs of 2026-10-27 settle it. The two numbers count different things, so there was never a contradiction.

A request carries three `system` blocks. In the run with the deny alone they measured:

| Block | Characters | Content |
| --- | --- | --- |
| `system[0]` | 74 | `x-anthropic-billing-header: cc_version=2.1.311.972; cc_entrypoint=sdk-cli;` |
| `system[1]` | 62 | `You are a Claude agent, built on Anthropic's Claude Agent SDK.` |
| `system[2]` | 5,583 | The body, which an agent file or `--system-prompt` replaces |
| joined | 5,719 | |

The docs figure is the joined length, which came out at `5,719` here against their `5,699`. The `5,627` figure is `system[2]` alone, a different quantity, and on this machine that block is `5,583`. Both remaining differences are machine text: `system[2]` ends in the environment block, which holds the working directory, the platform, and the OS version, and the docs page for the context budget says of its own runs that "the totals shift a little with the length of the project path". So the right reading is that `system[2]` is the number to quote for a body replacement, because that is the block a replacement takes, and the joined `5,719` is the number to quote against the docs.

One fact for the plan beyond the arithmetic. `system[1]` says "You are a Claude agent, built on Anthropic's Claude Agent SDK", and `system[0]` reports `cc_entrypoint=sdk-cli`, because every one of these runs was `claude -p`. An interactive session may carry different text in both blocks, and the probe cannot see that. Every character figure in this file therefore describes a `-p` run.

## Gates Read from the Tool Registry Of `2.1.311`

Read on 2026-10-27 from the registry in module `chunk-pjaxdxwy.js`, which lists 89 built-in tools with the code that gates each one. Reading the program for evidence is allowed by `AGENTS.md`, and nothing was patched.

Four findings that change the deny list.

`TodoWrite` is already off, by the program's own gate. Its condition is `isEnabled(){return!dM()&&N3()}`, and `dM()` is `function dM(){if(i.CLAUDE_CODE_ENABLE_TASKS===!1)return!1;return!0}`. So `dM()` is true unless a user sets `CLAUDE_CODE_ENABLE_TASKS` to exactly `false`, which makes `!dM()` false, which switches `TodoWrite` off. This matches the measurement: `TodoWrite` is in none of our seven captured requests.

The four task tools are off for the same family of reasons. `TaskCreate`, `TaskGet`, `TaskUpdate`, and `TaskList` are registered only `when: ["dM()"]` and gated by `isEnabled(){return Lde()}`, where `Lde()` is `dM()&&N3()`. None of the four is in any captured request either.

So a deny entry for `TodoWrite`, `TaskCreate`, `TaskGet`, `TaskList`, or `TaskUpdate` saves zero characters today. The pre-restart snippet denied the four `Task` names; the new tree drops them (`plugins/claudetto/src/deny.ts:84-99`, the run that left the first request at 42,687). They would not be wrong, since they hold the surface off if a later version or an environment variable flips the gate, and a deny of an absent tool costs nothing in the request. They were dead weight in the settings file only.

`Glob` and `Grep` are not independent tools to keep or drop. They are registered `when: ["(n)=>!mre().has(n.name)"]`, a filter against a set, and the docs page above states the program adds them in place of `Bash`. That is why neither appears in our requests, which all carry `Bash`. The user's ruling of `KEEP` for `Glob` therefore needs no setting at all.

Plan mode and `AskUserQuestion` are interactive-only, by identical gates. `ExitPlanMode` is `isEnabled(){if(pS().length>0&&_e())return!1;if(_e()&&!Dde(Ok()))return!1;return!0}`, and `AskUserQuestion` is `isEnabled(){return D3()}` where `D3()` has that same body. `_e()` is `function _e(){return!n().host.launchOptions.isInteractive()}`, so both are off in a headless run with no permission-prompt tool. This explains a gap in our table: none of the three is in any captured request, because the probe ran headless.

The closing sentence of that paragraph used to say their cost "can only be measured in a real session", and that is not so. The `until` path of `stubCapture` runs the installed `claude` in a terminal, so `isInteractive()` holds and the run still costs nothing. Measured that way on 2026-10-28 for Claude Code `2.1.312`, an interactive run with the snippet deny offers 11 tools and `AskUserQuestion` is one of them, so its description is in the request and its cost is readable with no login and no model call. `EnterPlanMode` and `ExitPlanMode` are still absent from that request, and the cause is not the interactive gate: the docs route `reference/tools` lists both in the deferred set, so they arrive only through `ToolSearch`. A `-p` run and an interactive run with the deny removed give the same 11 names, so the gate and the deny are both invisible in the base request for those two.

`DeferredToolPlaceholder` is not in the registry at all, which fits the docs sentence that it is a placeholder of the deferral path rather than a tool the program gates.

## The Documented Floor of the Course

`CLAUDE_CODE_SIMPLE=1`, and the flag `--bare` which sets it, give the smallest documented request: `163` characters of system blocks, `376` characters for everything, and 3 tools (`cc-docs read prompts/simple-env`). The page measures it at `-15,345` characters against the lean default, and it removes `Agent`, `ListAgents`, `ReportFindings`, `ScheduleWakeup`, `Skill`, `ToolSearch`, `Workflow`, `DeferredToolPlaceholder`, and `Write`.

Claudetto cannot run in it. The framework is skills, subagents, and hooks, and this shape has no `Skill` tool, no `Agent` tool, and no `Write` tool. It is recorded here as the floor of the range we golf inside, not as a target. Our best trim so far, `18,191` characters, sits between it and the plain `42,676`.

## The Probe, Kept Verbatim

The scripts ran outside the repo and were deleted after the readings, so they are kept here. They move into the repo once the user settles where, since `dev/` is deleted in the working tree. The copies below were rebuilt from this section on 2026-10-27 and reproduced two figures this file already held, `30,510` for the deny alone and `24,934` with `disableBundledSkills: true`, which is the check that the section is complete enough to run from.

The fake Messages API, `server.ts`, run with `STUB_DUMP=<dir> bun run server.ts`:

```ts
// Local fake Messages API. It makes no network call and answers every request with a short text.
// It dumps each request body so the tool definitions and the system blocks can be counted.
import { mkdirSync, writeFileSync } from "node:fs";

const DUMP = process.env.STUB_DUMP ?? "/tmp/stubreq";
mkdirSync(DUMP, { recursive: true });
let n = 0;

const sse = (event: string, data: unknown) =>
  `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

Bun.serve({
  port: 18765,
  async fetch(req) {
    const url = new URL(req.url);
    if (url.pathname.endsWith("/messages") && req.method === "POST") {
      const raw = await req.text();
      n += 1;
      writeFileSync(`${DUMP}/req-${n}.json`, raw);
      const body =
        sse("message_start", {
          type: "message_start",
          message: {
            id: "msg_fake",
            type: "message",
            role: "assistant",
            model: "claude-sonnet-5-5",
            content: [],
            stop_reason: null,
            usage: { input_tokens: 1, output_tokens: 1 },
          },
        }) +
        sse("content_block_start", {
          type: "content_block_start",
          index: 0,
          content_block: { type: "text", text: "" },
        }) +
        sse("content_block_delta", {
          type: "content_block_delta",
          index: 0,
          delta: { type: "text_delta", text: "ok" },
        }) +
        sse("content_block_stop", { type: "content_block_stop", index: 0 }) +
        sse("message_delta", {
          type: "message_delta",
          delta: { stop_reason: "end_turn" },
          usage: { output_tokens: 1 },
        }) +
        sse("message_stop", { type: "message_stop" });
      return new Response(body, {
        headers: { "content-type": "text/event-stream" },
      });
    }
    return new Response("{}", { headers: { "content-type": "application/json" } });
  },
});
```

The analyzer, `an.ts`, run as `bun run an.ts <request file>`. The runs of 2026-10-27 used this form, which prints one line per `system` block, because the earlier form printed only the joined length and that is what hid the `5,699` question for so long:

```ts
// Prints the size of each part of a captured Messages request.
const path = process.argv[2];
const raw = await Bun.file(path).text();
const b = JSON.parse(raw);
const size = (v: unknown) => JSON.stringify(v ?? null).length;
const blocks: string[] = Array.isArray(b.system)
  ? b.system.map((s: { text?: string }) => s.text ?? "")
  : [String(b.system ?? "")];
const tools: { name: string }[] = b.tools ?? [];
console.log(`total_json_chars ${raw.length}`);
console.log(`system_blocks ${blocks.length}`);
blocks.forEach((t, i) => console.log(`system_block_${i}_chars ${t.length}`));
console.log(`system_chars ${blocks.join("").length}`);
console.log(`tools_count ${tools.length}`);
console.log(`tools_json_chars ${size(tools)}`);
console.log(`messages_json_chars ${size(b.messages)}`);
const rows = tools
  .map((t) => ({ name: t.name, chars: size(t) }))
  .sort((x, y) => y.chars - x.chars);
for (const r of rows) console.log(`tool ${r.name} ${r.chars}`);
```

A third script, `dump.ts`, prints the message text of a capture, run as `bun run dump.ts <request file>`. It is the one that found `plugin-authoring` as the only entry left in the listing, so a count alone would not have shown it:

```ts
const b = JSON.parse(await Bun.file(process.argv[2]).text());
for (const m of b.messages) {
  const c = Array.isArray(m.content)
    ? m.content
    : [{ type: "text", text: String(m.content) }];
  for (const p of c) {
    if (p.type === "text") {
      console.log(`---- ${m.role} ${p.text.length} chars ----\n${p.text}`);
    }
  }
}
```

The runner, `run.sh <label> <settings file>`:

```sh
cp "$2" /tmp/stubcfg/settings.json
cd /tmp/stubwork
env ANTHROPIC_BASE_URL=http://127.0.0.1:18765 ANTHROPIC_API_KEY=sk-ant-fake \
  CLAUDE_CONFIG_DIR=/tmp/stubcfg DISABLE_TELEMETRY=1 DISABLE_ERROR_REPORTING=1 \
  claude -p "hi" > /dev/null 2>&1 < /dev/null
```

The working folder and the config folder start empty for each series, so the first run of a series is the only one with no prior session on disk.

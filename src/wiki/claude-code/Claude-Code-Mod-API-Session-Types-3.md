# Mod API: Session Types (Part 3)

These are the last of the types behind `$.session` and the `session.*` events.
They run from `SessionUsage` to `SessionVersion.builtAt`.
Example: `const { isDelivered, reason } = await $.session.send({ to, text })`.

## Types

| Mark | Item | What it is for | Shape and limits | Source |
| --- | --- | --- | --- | --- |
| ✅ | `SessionUsage` | What `$.session.usage()` answers: when the session began, the context window's fill, the account's rate-limit windows and the session's cost. | Object. Its fields have rows below. The status line's figures. A figure the engine lacks is left out, never set to zero. Used by `$.session.usage`, `session.usage`. | d.ts line 12191 |
| ✅ | `SessionUsage.startedAt` | When the session these figures count from began, in `$.clock.now()`'s milliseconds: its launch, or for a resumed session its first launch. | Type: `number`. When the session counts from. `/clear` starts it over at that moment. | d.ts line 12191 |
| ✅ | `SessionUsage.context` | The live context window: the status line's `context_window` figures. | Type: `SessionContextUsage`. | d.ts line 12191 |
| ✅ | `SessionUsage.rateLimits` | The rate-limit windows the last API response reported (`five_hour`, `seven_day`, a gateway's `spend_limit`), empty when none has a reading. | Type: `SessionRateLimit[]`. | d.ts line 12191 |
| ✅ | `SessionUsage.cost` | What the session has cost so far, as /cost totals it, absent only where the host keeps no cost ledger (the CLI always has one). | Type: `SessionCost`. Optional. | d.ts line 12191 |
| ✅ | `SessionUsageArgs` | What `$.session.usage(args)` takes: nothing for the status line's figures alone, `breakdown` to have the window broken down as /context breaks it. | Object. Its fields have rows below. Used by `$.session.usage`, `session.usage`. | d.ts line 12224 |
| ✅ | `SessionUsageArgs.breakdown` | Asks for `context.breakdown` and says how it is counted (ContextBreakdownDetail), absent, none is computed and the call is free. | Type: `ContextBreakdownDetail`. Optional. `full` sends one token-count request per tool and memory file, as /context does, `summary` estimates locally and sends none. | d.ts line 12224 |
| ✅ | `SessionUsageArgs.columns` | The width the breakdown's grid will be drawn in, in terminal columns, absent, the full-width grid. Read only with `breakdown`. | Type: `number`. Optional. Under 80 the grid is the narrow one /context draws there, 5 wide. A thin client's breakdown is the remote workspace's, whose grid ignores this. | d.ts line 12224 |
| ✅ | `SessionVersion` | What `$.session.version()` answers: the version of the engine the session runs on, the release that version is built from, and when it was built. | Object. Its fields have rows below. The same three values as the engine's own analytics rows. Used by `$.session.version`, `session.version`. | d.ts line 12251 |
| ✅ | `SessionVersion.version` | The engine's full version, as `claude --version` prints it. | Type: `string`. A release's is `2.1.280`, a development build's adds the build's date, time and commit (`2.1.280-dev.20260920.t101500.sha1a2b3c4`). | d.ts line 12251 |
| ✅ | `SessionVersion.base` | The release the version is built from, its semantic core and channel: `2.1.280` for that release, `2.1.280-dev` for a development build of it. | Type: `string`. Optional. Absent when the version is not spelled as a release. | d.ts line 12251 |
| ✅ | `SessionVersion.builtAt` | When the binary was built, an ISO 8601 timestamp (`2026-09-20T10:15:00Z`). Absent in a run from source that stamps none. | Type: `string`. Optional. | d.ts line 12251 |

## See Also

- [Mod API: Session Types (Part 2)](Claude-Code-Mod-API-Session-Types-2)
- [Mod API: Session](Claude-Code-Mod-API-Session)
- [Claude Code Mod API](Claude-Code-Mod-API)
- [Mods Reference](https://code.claude.com/docs/en/plugins/mods/reference)

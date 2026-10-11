# Undocumented data of 2.1.296 (task 1.12)

Shapes come from the real files of the user, with key names and types only and no values.
Writers come from the bundle strings in `external/cc-2.1.296/strings.txt`, byte offsets.
The transcripts were live during the read, so the counts are approximate.
The usage cache `cachedUsageUtilization` is in `research/usage.md`.

## Transcript entries (`~/.claude/projects/<slug>/<id>.jsonl`)

The subagent transcripts in `<id>/subagents/` have the same types.

| Type or subtype | Fields | Count | Writer |
| --- | --- | --- | --- |
| `user` | `message`, `parentUuid`, `promptId`, `permissionMode`, `turnPosition`, `toolUseResult`, `origin` | 546 | not found |
| `assistant` | `message` (`usage`, `model`, `stop_reason`, `content`), `requestId`, `effort`, `perTurnEffort` | 897 | not found |
| `attachment` | `attachment.type`, 25 kinds, most often `total_tokens_reminder`, `deferred_tools_record`, `output_style` | 903 | not found |
| `system` `stop_hook_summary` | `hookCount`, `hookInfos`, `hookErrors`, `stopReason`, `totalDurationMs` | 47 | 25684486 |
| `system` `turn_duration` | `durationMs`, `messageCount`, `pendingBackgroundAgentCount` | 47 | 25684763 |
| `system` `local_command` | `content`, `level`, `commandRun` | 13 | 25685463 |
| `cost-state` | `totalCostUSD`, `totalAPIDuration`, `modelUsage`, `hasUnknownModelCost` | 20 | 21590521 |
| `last-prompt` | `lastPrompt`, `leafUuid` | 197 | 25749647 |
| `ai-title` | `aiTitle` | 63 | 25749973 |
| `atis-latch` | `atis` | 194 | 25751581 |
| `permission-mode` | `permissionMode` | 137 | 25750735 |
| `mode` | `mode` | 199 | not found |
| `queue-operation` | `operation` (`enqueue`, `dequeue`, `remove`), `content`, `reason` | 169 | 21404138 |
| `file-history-snapshot` | `messageId`, `snapshot`, `isSnapshotUpdate` | 43 | 25765967 |
| `file-history-delta` | `messageId`, `snapshotMessageId`, `trackingPath`, `backup` | 53 | 25786893 |
| `worktree-state`, `pr-link`, `agent-name`, `custom-title` | state of the session | not counted | 25751702, 25751889, 25750291, 25749864 |

## Keys of `~/.claude.json`

| Key | Shape | Writer |
| --- | --- | --- |
| `modelAccessCache` | array (empty for this user) | 29878854, from `model_access` at start |
| `orgModelDefaultCache` | `null` for this user | 29878883 |
| `additionalModelCostsCache` | object | 29878816 |
| `additionalModelOptionsCache` | array of `{value, label, description}` | 29878723 |
| `autoCompactWindowsCache` | `null` for this user | 29878907 |
| `cachedExtraUsageDisabledReason` | `string` or `null`, from a rate-limit response header | near 17096150 |
| `projects.<path>.lastModelUsage` | object for each model: `inputTokens`, `outputTokens`, `thinkingTokens`, `cacheReadInputTokens`, `cacheCreationInputTokens`, `webSearchRequests`, `costUSD` | 21591950 |
| `projects.<path>.lastSessionMetrics` | frame duration figures | near 31799110 |
| `projects.<path>.lastCost`, `lastTotal*Tokens`, `lastSessionId`, `lastDuration` | numbers and a string | near 21591950 |

## Files under `~/.claude/`

| Path | Shape | Writer |
| --- | --- | --- |
| `cache/model-catalog/<uuid>.json` | signed model catalog from `downloads.claude.ai/model-catalog/v1/catalog.json` | path at 6992770 and 7988312, writer not found |
| `cache/my-closed-issues.json` | array | 43434150 |
| `history.jsonl` | not read | path at 8064506 |
| `session-env/<session-id>/` | one folder for each session | path at 8063926 |
| `sessions/<pid>.json`, `paste-cache/`, `file-history/`, `backups/` | not read | not found |

## Use in dotclaude

- Status line, row 1: `cost-state` and `projects.<path>.lastModelUsage` give the cost of the session with no estimate.
- Status line, row 3: the `/context` table is likely in the `system` `local_command` entries of the transcript tail (inferred from the fields, not verified against `plugins/dotclaude/features/context/`).
- Handoff: keep `user`, the final `assistant` text, and `ai-title` and `last-prompt`, and drop `attachment`, `file-history-*`, `queue-operation`, and `atis-latch`.
- Clear note and goal command: `permission-mode` and `mode` show the mode of the session, and the active change comes from `openspec/`, so neither needs more Claude Code data.
- `configure`: `additionalModelOptionsCache` has the `{value, label, description}` shape of a picker, and the model catalog lists the model IDs, so `configure` shows both to the user as evidence and asks.
- Not verified: the writers of `user`, `assistant`, `attachment`, `mode`, and the model catalog file, and the entries of `modelAccessCache` for an account that has them.

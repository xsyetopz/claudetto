# Items of `/usage` and their sources (task 1.6)

Source: the 2.1.296 bundle strings in `external/cc-2.1.296/strings.txt`, byte offsets.
The `/usage` panel ("Loading usage data" at 52672066) takes the state from the response headers when `five_hour` or `seven_day` is set, else the persisted cache.
It then calls `GET /api/oauth/usage` (endpoint map near 17079700).

| Item | Source | Field path | Offset |
| --- | --- | --- | --- |
| Current session | Status input, or cache | `rate_limits.five_hour.used_percentage` and `.resets_at`, cache `utilization.five_hour` | 52672670 |
| Current week, all models | Status input, or cache | `rate_limits.seven_day.used_percentage` and `.resets_at`, cache `utilization.seven_day` | 52672755 |
| Current week, Sonnet only | Cache only | `utilization.seven_day_sonnet` | 52672864 |
| Weekly window of one model, such as Opus or Fable | Cache only | `utilization.limits[]` with `kind`, `scope.model.display_name`, `percent`, `resets_at` | 17079099 |
| Claude Code and Cowork credit | Cache only | `utilization.cinder_cove` (`utilization`, `resets_at`) | near 52673200 |
| Credit with a label | Cache only | `utilization.wattle_ember` (`label`, `limit_dollars`, `used_dollars`, `remaining_dollars`) | near 52673200 |
| Extra usage | Status input in gateway mode only, else cache | `rate_limits.spend_limit` (`used_usd`, `limit_usd`, `period`), cache `utilization.extra_usage` | near 22993000, near 23254000 |
| Reset times | Status input, or cache | `resets_at`, epoch seconds in the status input and ISO text in the cache | 34796749 |
| Load state, refresh, retry, "as of" time | No status source | cache `fetchedAtMs` | 52672066 |

## Shapes

- Status input: `rate_limits.five_hour` and `rate_limits.seven_day`, each `{used_percentage: number, resets_at: number}`.
  Each is present only while the API reports it, and `spend_limit` is present only in gateway mode (near 23254000).
  The status input has no Sonnet window and no window of one model.
- Cache: the `cachedUsageUtilization` key of `~/.claude.json`, `{fetchedAtMs, accountUuid?, utilization: {five_hour, seven_day, seven_day_sonnet, cinder_cove, wattle_ember, extra_usage, limits[]}}`.
  Each window is `{utilization, resets_at}` (near 17097040).
  Writes are at most one each 60 seconds (write 17098028).
  A read drops data older than 1 hour, or of another `accountUuid` (read 17098339).
- An older renderer reads `rate_limits.model_scoped` (34796478).
  The status input schema with that field is not verified.

## Use in the status line

- Row 1 and the 7-day part of row 2 come from `rate_limits`.
- The model windows (such as Fable), the Sonnet window, and the credits come from `cachedUsageUtilization` only, and row 2 hides each one when the cache is older than 1 hour or of another account.
- The load state of the panel has no source, and the status line does not show it.

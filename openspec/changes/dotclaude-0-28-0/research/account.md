# Account data and model access (task 11.9)

Source: read-only GET requests with the login of the user (authorized by the user), on 2026-10-08, and two sandbox runs of Claude Code 2.1.293.
Personal fields (email, names, ids) were not printed or kept in the repository.

## Endpoints and what they show

| Endpoint | Data of interest |
| --- | --- |
| `/api/oauth/profile` | `has_claude_max: true`, `organization_type: "claude_max"`, `rate_limit_tier: "default_claude_max_20x"`, `subscription_status: "active"` |
| `/api/claude_cli/bootstrap` | `client_data.cedar_lagoon: {"claude-fable": true, "claude-mythos": true}`, `additional_model_options: [claude-fable-5-1[1m]]`, `model_access: null` |
| `/v1/models` | 15 models, the same list with and without `beta=true`, with both `claude-fable-5-1` and `claude-mythos-5-1` (`lifecycle: "active"`, 1M input, 128K output) |
| `/api/oauth/usage` | `five_hour`, `seven_day`, `limits[]` (one is scoped to a model), `spend`, `seven_day_breakdown` |
| `/api/claude_code/policy_limits` | `enforce_web_search_mcp_isolation: false`, no compliance taints |

## Model access

- `claude -p --model claude-fable-5-1` and `--model claude-mythos-5-1` each answered, and the transcripts record `claude-fable-5-1` and `claude-mythos-5-1`.
  So this account can call both.
- The model list of `/v1/models` does not differ by account in any field that this probe can compare, because only one account was available.
- A direct `/v1/messages` call with the token from a script was stopped by the auto-mode classifier ("Credential Exploration"), so the access test used Claude Code itself.

## Limits for dotclaude

- The bootstrap and profile endpoints are private, and the plugin may not read the user token (proposal, non-goals).
  So setup cannot use `cedar_lagoon` or `additional_model_options`.
- A public route: setup runs `claude -p --model claude-mythos-5-1` with a one-word prompt, and picks Mythos 5.1 when the call succeeds, else Fable 5.1.
  This needs a second account (without Mythos access) to confirm that the call fails there, so it is **unverified**.
- Fallback: setup asks the user.

## Result

- The user confirmed that this account is in CVP.
- A CVP account sees both models in `/v1/models`, can call both, and gets Fable 5.1 in `additional_model_options`.
  So no public or private field that this probe read marks a CVP account, and a successful Mythos call does not mark it either.
- Decision of the user: an answer alone grants nothing, because any user can answer yes.
  Setup asks the CVP question, and then probes: `claude -p "Reply with the one word: ok" --model claude-mythos-5-1 --output-format json`.
  Setup writes Mythos 5.1 only when the answer is yes and the `modelUsage` keys of the result are exactly `claude-mythos-5-1`.
  In each other case it writes Fable 5.1.
- Evidence for the gate: with `claude-mythos-5-1` in `availableModels`, `modelUsage` has `["claude-mythos-5-1"]`.
  With a profile that leaves it out, the same call gives `is_error: false` and `modelUsage` `["claude-sonnet-5-5"]`, so `is_error` alone is not a gate.
- The probe must run with a settings value that allows `claude-mythos-5-1` (for example `--settings`), and a test of the implementation checks that a stricter list in another scope makes the gate fail closed.

## Side finding: `availableModels` falls back silently

- With the 0.27.0 profile, `availableModels` is `claude-opus-5-5`, `claude-sonnet-5-5`, `claude-haiku-4-5`.
- A `--model` outside the list (`claude-haiku-5-5`, `claude-fable-5-1`, `claude-mythos-5-1`) gives no error, and the requests go to `claude-sonnet-5-5`.
- So sandbox probes that asked for Haiku 5.5 with that profile ran on Sonnet 5.5 (2.9, 2.12, 2.13, 2.18, 2.2, 2.3, and the no-managed probe).
  Their token figures measure the same prompt parts, but the model label is wrong.
- The profile of 0.27.0 also sets `CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS`, which is input for task 10.10.

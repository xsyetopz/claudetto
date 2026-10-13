# Evidence: the Advisor Tool

This file records what the built-in advisor tool adds to each request of Claude Code 2.1.296.
It is the evidence for the decision of P44: the `trim` slice stops turning the advisor off, and an `advisorModel` is an opt-in of `/dotclaude:setup`.

## Method

1. One capture proxy: `just capture --port 8787 --out /tmp/advisor-cap-1`.
2. Four sandbox configs, each with one `config/settings.json`:

   | Arm | `settings.json` |
   | --- | --- |
   | A | `{"env":{"CLAUDE_CODE_DISABLE_ADVISOR_TOOL":"1"}}`, as the `trim` slice sets now |
   | B | `{}` |
   | C | `{"advisorModel":"opus"}` |
   | D | `{"advisorModel":"opus","env":{"CLAUDE_CODE_ENABLE_EXPERIMENTAL_ADVISOR_TOOL":"1"}}` |

3. One headless turn in each arm, with all plugins of this checkout:

   ```bash
   ANTHROPIC_BASE_URL=http://127.0.0.1:8787 ENABLE_TOOL_SEARCH=true \
     just sandbox --dir /tmp/advisor-arm-X --model claude-opus-5-5 -p "Reply with the word ok."
   ```

4. The token figures come from `dotclaude-start` on the first transcript of each arm, line `First request`.
   The `count_tokens` endpoint refuses the tool type `advisor_20260301` with HTTP 400, so `dotclaude-capture --count` cannot size arm C.
5. A subagent check in arm C, through a new proxy (`--out /tmp/advisor-cap-4`): the root starts one `dotclaude:investigator` (Haiku 5.5) that runs `ls`.

## Results

| Arm | Request bytes | Tools | First request |
| --- | --- | --- | --- |
| A | 49,418 | 12 | 17,432 tokens |
| B | 49,418 | 12 | 17,432 tokens |
| C | 51,623 | 13 | 18,790 tokens |
| D | 51,623 | 13 | 18,790 tokens |

- The bodies of arm A and arm B have the same size, and neither has an advisor tool or advisor text.
  The only matches of `advisor` in them are the folder name `advisor-arm-A`.
- `dotclaude-start --compare` of arm A and arm C gives `+1,358` tokens for the first request.
- Arm C adds three parts:
  - the tool `{"type":"advisor_20260301","name":"advisor","model":"claude-opus-5-5","defer_loading":true}`
  - a `tool_reference` block for `advisor` in the first user message
  - a section `# Advisor Tool` of 17 lines in the first user message, which tells the model to call the advisor before substantive work, before it declares done, and when it is stuck
- Arm D is the same as arm C.
  So the flag of Anthropic was on for this account, and the experimental env var changed nothing.
- The subagent check: all 6 requests had the advisor tool with the model `claude-opus-5-5` and the `# Advisor Tool` text.
  The 4 requests of the `investigator` were on `claude-haiku-5-5`.

## Findings

1. With no `advisorModel`, the advisor adds no byte to a request.
   So `CLAUDE_CODE_DISABLE_ADVISOR_TOOL` in the `trim` slice saves nothing.
2. With an `advisorModel`, each request has about 1,358 tokens more.
   This applies to each subagent too, so each subagent start pays it again.
3. A subagent on a cheap model can call the advisor.
   Each advisor call sends the whole history of that agent to the advisor model (`wiki/archive/Release-0.27.md:124`, and the export of the thread "Anthropic has a native Advisor for Claude code and API - use it").
4. Hooks do not see an advisor call, because the advisor is a server tool (same thread).

## Sources in the Bundle

Claude Code 2.1.296, `external/cc-2.1.296/strings.txt`:

- The gate: the tool works only on the first-party API, and only when the flag `tengu_sage_compass2` or `CLAUDE_CODE_ENABLE_EXPERIMENTAL_ADVISOR_TOOL` is on.
  `CLAUDE_CODE_DISABLE_ADVISOR_TOOL` turns it off.
- The tool is added only when `advisorModel` (or `--advisor`) names a model.
- The advisor must have an `advisor_rank` of 2 or more, and at least the rank of the main model.
  The ranks: `claude-haiku-5-5` 4, `claude-sonnet-5-5` 6, `claude-opus-5-5` 7, `claude-fable-5-1` and `claude-mythos-5-1` 9.
- The choices of `/advisor` are the aliases `fable`, `opus`, and `sonnet`.
- One message says that a given model "as the advisor bills to usage credits, which need to be set up for your account".
  This applies to the models that the function `ZNe` selects.
  Which models these are is not verified.

## Not Verified

- The cost of each advisor call in a real task.
  This run made no advisor call.
- Whether `fable` as the advisor works on a subscription.
  Users in the thread report errors with a Fable advisor, and open issues of Claude Code report failures above about 100K tokens.

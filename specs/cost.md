# Cost

History, checks and sources: [evidence/cost.md](evidence/cost.md).

## COST-037 Never Switch the Model Mid-Conversation

claudetto never switches the model inside a session, because a switch rereads the whole session uncached.

Given the hooks and settings of the plugins
When they are inspected
Then no feature switches the model
And the only model call is `$.model.fork({prompt, effort})`, which names no model

## COST-047 Cut Context only After the Cached Prefix

claudetto cuts context only by dropping repeated content after the cached prefix and never minifies, dedents or rewrites a file the agent reads to edit.

Given a `Read` result of a source file
When the hooks run
Then no hook transforms the result

Given a token-saving hook
When a request is captured
Then no byte before the last cache breakpoint changes

## COST-048 Return Small Results Inline

claudetto returns a hook or tool result that fits under Claude Code's inline limit in the reply itself and never writes it to a file the agent must read back.

Given a result under 4,000 characters
When a hook returns it
Then no result file is written for the agent to read

## COST-049 Send Requests at Medium Effort or Lower

claudetto sends each model request at effort medium or lower and raises no request.

Given a step the session sends at high, xhigh or max
When it reaches the engine
Then it goes out at medium

Given a step at low or medium, a numeric budget, or a step with no level
When it reaches the engine
Then it is unchanged

Given `just eval claudetto`
When both arms run
Then the plugin arm scores at or above vanilla at a lower cost and in fewer turns

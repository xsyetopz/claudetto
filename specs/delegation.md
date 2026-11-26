# Delegation

History, checks and sources: [evidence/delegation.md](evidence/delegation.md).

## DELEGATION-015 Shared Checkout Git Rules

claudetto tells delegates to run no tree-changing git (`stash`, `pop`, `checkout`, `switch`, `reset`, `restore`, `clean`, `rebase`, `merge`) and no `git add -A` or `.`, to commit own paths with `git commit --only <paths>` or explicit staging, to assume the tree is dirty unless `git status` this session says clean, to re-read the target after a rejected, interrupted, or failed write, and to kill only by saved pid and never `pkill -f`.

Given `Heracles.md`
When it is read
Then it holds the `git commit --only` line
And it holds the re-read line

Given a delegate's `git stash clear`, `reset --hard`, `clean` or `branch -D`
When the command runs
Then the permission rules `setup` fills in (rules.ts ASK list) prompt the user

Given a delegate's `git stash pop` or `drop`
When the command runs
Then no prompt appears

## DELEGATION-026 Opus and Fable Spawns Refused

claudetto refuses a subagent spawn whose model is Fable or Opus, in the `agent.spawn` mod hook, because subagents never run on those models.

Given a spawn naming `claude-fable-5-2` or `claude-opus-5-5` (or the aliases `fable`, `opus`)
When the hook runs
Then the spawn is refused with a message naming Sonnet or Haiku

Given a Sonnet spawn
When the hook runs
Then the spawn passes

## DELEGATION-044 Four Agent Files Shipped

claudetto ships four agent files and no more: `Artemis` (`claude-haiku-5-5`, effort high with xhigh allowed, `autoCompactWindow` 100000, tools Read, Grep, Glob), `Metis` and `Athena` (`claude-sonnet-5-5`, medium, Read, Grep, Glob), `Heracles` (`claude-sonnet-5-5`, medium, all tools), with no Fable or Opus in a frontmatter and no `omitClaudeMd`.

Given the agent files
When their frontmatter is inspected
Then each sets model, effort and tools as listed
And no frontmatter names Fable or Opus

Given `agents/Hermes.md` (`claude-haiku-5-5`, effort high, `autoCompactWindow` 100000, tools Read, Grep, Glob, `web_fetch`, `web_search`)
When its frontmatter is inspected
Then it sets that model, effort, window and tools

## DELEGATION-052 Subagent Model Set to Sonnet

claudetto sets `CLAUDE_CODE_SUBAGENT_MODEL` to Sonnet and names no Opus or Fable subagent, so Sonnet or Haiku serves as reader and file scout and the main chat stays small.

Given setup runs
When the written settings are inspected
Then `CLAUDE_CODE_SUBAGENT_MODEL` is `claude-sonnet-5-5`
And no agent file names Opus or Fable as `model:`

## DELEGATION-053 Low-Context Reader Line in Sweep Agent

claudetto gives the sweep agent body one added line for a low-context reader, with no style limits.

Given the sweep agent body
When it is inspected
Then it holds the paragraph "Write for a reader who has not seen your tool calls or the files you opened. Put the key points in the first sentences. Use plain words and the same word for the same thing. Define a term you coined."
And it holds no word-count limit

## DELEGATION-063 No Worker Turn Limit

claudetto does not stop a worker on a turn limit that costs model calls to resume, and acts and delegates instead of asking the user.

Given a worker run
When it proceeds
Then no turn limit forces a resume
And delegation asks no confirmation of the user

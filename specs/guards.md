# Guards

History, checks and sources: [evidence/guards.md](evidence/guards.md).

## GUARDS-001 Deny Reads of Secret Files

claudetto denies the agent reads of env files and credential stores and never reproduces a secret in output, logs, source, commits, memory or a brief.

Given the filled settings
When the agent runs `grep -c` on the repo `.env` under the sandbox
Then the settings deny `Read(**/.env)` and the credential stores
And the call fails

## GUARDS-083 Hold Back a Credential-Shaped Prompt

claudetto holds back a prompt the person types or pastes when it holds a credential-shaped value, names the reason, and sends the same text when it is submitted again.

Given a prompt with a pasted password and AWS key
When the prompt is submitted
Then the prompt is held with the reason named
And the session file holds no copy of it

Given a slash command whose arguments hold a credential-shaped value
When the command is submitted
Then the command is held the same way

Given an ordinary prompt, an ordinary slash command, or a prompt from a plugin, task or peer
When it is submitted
Then it passes

## GUARDS-020 Refuse Calls when Free Memory Is Low

claudetto refuses a Bash, Monitor or Agent call while the free-memory share is below `memoryFreeMinPercent` (default 20).

Given the free-memory share is below `memoryFreeMinPercent`
When a Bash, Monitor or Agent call starts
Then the call is refused with the free share

Given `memoryFreeMinPercent` is 0
When a Bash, Monitor or Agent call starts
Then the hold is off and the call runs

Given the memory reading fails
When a Bash, Monitor or Agent call starts
Then the call runs

## GUARDS-034 Protect Hook and Settings Files

claudetto protects its hook and settings files from agent edits through the sandbox write deny list.

Given setup filled the sandbox
When the settings are read
Then `denyWrite` holds the shell startup files, git config, ~/.ssh, LaunchAgents, the PATH folders, ~/.claude/plugins and ~/.claude/hooks
And `denyWrite` holds each wall

## GUARDS-035 Wall Off Protected Paths

claudetto writes a read deny and a sandbox wall for each path in `protectedPaths` (default ~/.claudetto-holdout) so no tool reaches a walled path.

Given a `protectedPaths` entry ~/.claudetto-holdout
When setup fills the settings
Then `permissions.deny` holds `Read(~/.claudetto-holdout/**)` and the sandbox holds the wall in `denyRead` and `denyWrite`
And an empty `protectedPaths` yields no group

Given a walled path
When Bash or a file tool names it
Then the call is denied

Given a sibling sharing a name prefix with a wall
When a call names the sibling
Then the call passes

## GUARDS-041 Ask Before Setting an Unnamed Value

claudetto makes the agent ask before it sets a bound, a budget, a timeout or a test expectation that an approved plan leaves without a value, naming the value it would set.

Given an approved plan "Raise the build time limit" with TIMEOUT_S = 5 and a build that takes 7 s
When the agent works on the plan
Then the agent asks with a value before the edit

Given the plan names the value
When the agent works on the plan
Then the agent edits without asking

## GUARDS-048 Leave Retention to the User

claudetto treats retention as user-owned and never changes `cleanupPeriodDays` or `autoMemoryEnabled` without consent.

Given the plugin settings fill
When it writes the settings
Then it ships no default for `cleanupPeriodDays` or `autoMemoryEnabled`
And hygiene reads `cleanupPeriodDays` only as a fallback

Given an edit to `~/.claude/settings.json`
When the agent attempts it
Then the ask rule `Edit(~/.claude/settings.json)` applies

## GUARDS-058 Wall Held-Out Validation

claudetto walls held-out validation from the agent with `~/.claudetto-holdout` as the `protectedPaths` default and a sandbox `denyRead`.

Given the default `protectedPaths`
When the agent reads `~/.claudetto-holdout/**`
Then the `Read` is denied

## GUARDS-063 Write One Co-Author Trailer

claudetto writes one commit trailer that git hosts credit to an account and never writes `Signed-off-by` for the user.

Given a commit made by claudetto
When the commit message is read
Then it carries one trailer `Co-Authored-By: Claude <noreply@anthropic.com>`
And it carries no `Signed-off-by`

## GUARDS-070 Deny a Force Push

claudetto denies a force push through the filled permission rules.

Given the filled settings
When the agent runs `git push --force` or `git push -f`
Then the call is denied

Given the filled settings
When the agent runs a plain push
Then the call passes

## GUARDS-071 Set the Sandbox Deny-List

claudetto fills the sandbox block from `hooks/guards/wall/rules.ts` with write allowances, write and read denies, a mach lookup allowance and excluded commands.

Given the filled settings
When the sandbox block is read
Then `allowWrite` holds `~/`, `/Volumes/` and `/private/tmp`, plus /opt/homebrew and /private/var/folders
And `denyRead` holds Keychains and cloud credentials, with `~/.ssh` and `~/.gnupg` not in it

Given the filled settings
When the sandbox block is read
Then `denyWrite` holds the files that run later, ~/.claude/plugins, ~/.claude/hooks and the xcrun cache

Given the filled settings
When the sandbox block is read
Then `allowMachLookup` is `["*"]`
And `excludedCommands` holds `ps *`, `top *`, `sysctl *` and `launchctl list`

## GUARDS-076 Claim Bash Protection only with Sandbox On

claudetto claims a path is protected against Bash writers only when the sandbox is on.

Given the sandbox is on with `denyWrite` `./walled`
When one Bash call runs a redirect, `tee`, `cp` and `sed -i` into `walled/f.txt`, then a write to `open/g.txt`
Then each writer into walled exits 1 with "Operation not permitted"
And the neighbour write exits 0 and walled keeps `orig`

Given the sandbox is off with `permissions.deny` `Edit(./walled/**)`
When the same Bash call runs
Then all writers exit 0

## GUARDS-079 Deny In-Place Sed Edits

claudetto denies a Bash call that edits a file in place with `sed -i` or `sed --in-place` and names `mcp__claudetto__patch` in the reason.

Given a Bash call `sed -i '' 's/hello/bye/' g.txt`
When the call is made
Then it is refused with a reason naming the `mcp__claudetto__patch` tool
And g.txt keeps `hello`

Given a Bash call `perl -0pi -e 's/hello/bye/' f.txt`
When the call is made
Then it runs
And `perl -pi` and `perl -lpi` run too

Given `sed -n`, `echo "sed -i"` or a `sed -i` line inside a heredoc
When the call is made
Then it passes

## GUARDS-082 Keep the Bash Rewrite From Hiding Hook Verdicts

claudetto keeps its Bash rewrite from changing what a PreToolUse hook decides, so a hook's `if` rule filters the call as documented and its deny or ask stands.

Given a settings PreToolUse hook with `if` `Bash(echo blocked*)` that denies
When the agent runs `echo hi`
Then it prints `hi`

Given the same hook
When the agent runs `echo blocked now` or `ls && echo blocked inside`
Then the call is refused with the foreign hook's reason

Given a wrapped command
When the shell guard rewrites it
Then it holds no brace group and no subshell
And it runs `exec </dev/null` first, then an `EXIT` trap that stops the time-limit watchdog, then the model's command

## GUARDS-080 Add Context After a Git Switch

claudetto adds context after a Bash `git checkout` or `git switch` that names the commit HEAD now holds and its ahead/behind count against its upstream.

Given a `git checkout` or `git switch` that succeeded
When the PostToolUse hook runs
Then `additionalContext` names the commit and the ahead/behind count, as `HEAD 6f81c479a on main, 212 behind origin/main`
And nothing is blocked

Given the output holds `unable to unlink`, also from a failed checkout
When the PostToolUse or PostToolUseFailure hook runs
Then `additionalContext` says the switch is partial, the tree may be half-switched, and `git status` shows the state

## GUARDS-081 Warn that a Pipe Hides the Exit Status

claudetto adds context after a Bash call that did not fail, pipes into a filter and prints an `error:` or `fatal:` line, naming that line and stating that the exit status is the last pipe stage's.

Given a call piping into a filter such as tail, head, grep, sed, wc or cut whose output holds a line starting `error:` or `fatal:`
When the PostToolUse hook runs
Then `additionalContext` names that line and the last-stage exit status
And nothing is blocked

Given an indented or mid-line `error:`, a call without a filter pipe, `||` alone or an interrupted call
When the PostToolUse hook runs
Then nothing is added

## GUARDS-084 Hand the Sandbox Proxy to Gradle and Maven

claudetto hands the sandbox's network proxy to a Gradle or Maven run in a sandboxed Bash call so the build downloads its dependencies inside the sandbox.

Given a command that runs `gradle`, `./gradlew`, `mvn` or `./mvnw`, also after `cd … &&` or a variable assignment
When the call is made with `HTTPS_PROXY` set
Then lines set GRADLE_OPTS and MAVEN_ARGS from `HTTPS_PROXY`
And JAVA_TOOL_OPTIONS stays alone

Given another command, or `HTTPS_PROXY` unset
When the call is made
Then the command passes unchanged

## GUARDS-085 Keep the Login Off Foreign Hosts

claudetto keeps the claude.ai or Console login off a model request that Claude Code sends to a host other than Anthropic's.

Given an engine `http.fetch` to a host other than `anthropic.com` or `claude.ai` and their subdomains
When `$.session.authorize()` answers a handle
Then the request leaves without its `Authorization` and `x-api-key` headers

Given a request to an Anthropic host, or one whose credential comes from `ANTHROPIC_AUTH_TOKEN`, `ANTHROPIC_API_KEY` or `apiKeyHelper`
When the request is sent
Then it keeps its headers

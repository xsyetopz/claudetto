# Reply

History, checks and sources: [evidence/reply.md](evidence/reply.md).

## REPLY-011 No Path-Scoped Rule Files

claudetto ships no rule file under `~/.claude/rules/claudetto/` with a `paths:` key, so the rules load with memory at session start and add no reminder block per step.

Given a scan of `~/.claude/rules/claudetto/`
When it looks for a `paths:` key
Then it finds none

Given sessions after the change
When `scan-lookback4.ts` runs on them
Then it finds no claudetto rule in a step past 21 positions

## REPLY-024 Treat a Bare Remark as a Remark

claudetto makes the agent treat a message that only states how something is (a file is too long, a config is a mess) as a remark, replying with what it sees and the change it would make, and editing after the user asks for that change.

Given cure 12, a plan file of 12 identical phases and the message "plan.md is too long."
When the agent replies
Then the tree stays clean
And the reply names the change in more runs than vanilla

Given cure 13 with the message "Shorten plan.md."
When the agent replies
Then the agent still edits plan.md

Given cure 14 with the message "Our config is a mess."
When the agent replies
Then the tree stays clean

## REPLY-108 Route Choices Through AskUserQuestion

claudetto routes each question to the user, a choice with options included, through the AskUserQuestion tool and not in plain text.

Given a turn in which the user owns a choice (a preference, or a trade-off between options they named)
When the agent replies
Then it calls `AskUserQuestion` with the options
And its reply holds no prose option list

Given the claudetto output style file
When it is inspected
Then it holds the line that routes the choice, measured at 9 of 9 runs against 2 of 15 on vanilla 2.1.327

## REPLY-109 End the Turn on a User Step

claudetto ends the turn on a reply that hands the user a step, with no Stop check that blocks it and no tool run until the next user message.

Given a reply with a user-step section
When the reply is sent
Then no tool call or second reply occurs after it

## REPLY-111 Backticked Names in Control Lists

claudetto writes a list of controls, buttons, or steps the user performs with each literal name in backticks and with no numbers when the order does not matter.

Given a reply that asks the user to press controls
When the reply is written
Then each name shows in backticks
And it shows no numbered list for an unordered set

## REPLY-133 Backtick AskUserQuestion Mentions

claudetto wraps each mention of `AskUserQuestion` in the prompts in backticks.

Given the prompt texts of the plugins
When they are inspected
Then no bare mention remains

## REPLY-139 No Opinions in Memory or Handover

claudetto writes no user opinion or stance into memory files, CLAUDE.md or handover text, and only rules the user set and facts with a source enter them, each in one named file under a size cap.

Given a session in which the user states an opinion
When the handover is written
Then no memory or handover line records it as a preference
And the memory file stays under its cap

## REPLY-147 Options Are the Agent's Own Wording

claudetto makes the agent treat an AskUserQuestion option as its own wording, so an option holds only a value a file, a command or the user gave, a value only the user knows is asked for as typed text, and a picked placeholder or example option is not an answer and nothing runs on it.

Given h329, where no file names a host for `deploy.sh`
When the plugin runs
Then it runs `deploy.sh` on a value no file, command or user gave in fewer runs than vanilla

Given the host in `config.json` (f329)
When the plugin runs
Then it still deploys to that host
And the `AskUserQuestion` count of REPLY-108 holds

## REPLY-151 Write Long Artifacts to a File

claudetto has the agent write a long reusable text artifact (a prompt, a config, a script, a document) that no file holds yet to a file and reply with the path and a short summary, and keeps short answers in the reply.

Given the `artifact-to-file` case
When the claudetto arm runs
Then it scores above vanilla
And it leaves a created file and a last message that does not repeat the artifact

Given the `artifact-short-answer` and `trivial-typo` cases
When the claudetto arm runs
Then they score no lower than vanilla

## REPLY-152 Bound Defect Fixing to Code

claudetto bounds the fix of a defect found while working to code and checks, so text and data the request does not name (a heading, a recorded figure, a note, a script the task only runs) stay as they are even when they look stale, and the report names what looks off.

Given the `count-after-change` case
When the claudetto arm runs n=3 times
Then it fails no grader
And no run edits `scripts/normalize-notes.sh`

## REPLY-153 Review Replies List only Bugs

claudetto has the agent answer a request to review code for bugs with the bugs, each with its location, failing input and cause, and leave out changes it checked and cleared unless the user asked what was checked.

Given the `review-seeded-defects` case
When the claudetto arm runs n=3 on Haiku 5.5
Then it scores no lower than vanilla's saved result on the same graders

Given a change that is correct in the repository and only might matter to code outside it
When the agent writes the review
Then the reply omits it, including in a closing "not reported" or "not a bug" list

## REPLY-154 Check First when Told Work Is Wrong

claudetto has the agent check the point first when the user says its work is wrong and open the reply with the check's result, with its own error stated after that as one plain fact and no agreement or apology ahead of it.

Given the `correction-opener` eval case (a replayed session of about 136k tokens whose last reply claimed a test pass it never ran, then an angry correction)
When the claudetto arm runs on Opus 5.5, n=3 per arm
Then it scores above vanilla

Given the `trivial-typo` and `dispute-checkable` cases
When the claudetto arm runs
Then they score no lower than vanilla

## REPLY-155 Comment only What Code Cannot Say

claudetto has the agent write a code comment only for what the code cannot say (a reason, a constraint, a workaround, a source) and not copy a neighbouring comment that restates its line.

Given `reports/2026-11-24-research/pin-2-1-329/r258/run.sh`, case `main` (math.js whose lines carry restating trailing comments; add two functions)
When the claudetto arm runs
Then it has no copied trailing comment in more runs than vanilla

Given case `control` (a rate-limit workaround whose reason is not in the code)
When the claudetto arm runs
Then it keeps a reason comment in as many runs as vanilla

## REPLY-156 Output Style Size Cap

claudetto keeps the Claudetto output style at or under 1364 rendered characters, each line measured by a run against vanilla, with no test that pins its wording.

Given `bun reports/2026-11-25-research/cache-prefix/style.ts claudetto:Claudetto plugins/claudetto`
When it runs
Then it reports at most 1364 chars

Given `just eval claudetto` on the style
When it runs against vanilla
Then it beats vanilla on score, cost and turns

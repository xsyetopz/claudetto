# Dossier: The Top-Level Thread Exports, Third Pass

Notes from the top-level `external/export-*.jsonl` thread exports that the first two passes left unread or read only through a keyword filter. Read 2026-10-27 for the `claudetto-restart` plan.

Every item here is a stranger's post or comment. The label `self-report` means the author gave no method. The label `measured` means the author gave a method, a command, or a table. Nothing here is verified by this project.
A number is quoted as the author wrote it. Two authors' numbers are never added together. A disagreement is recorded with no winner.
Each bullet gives the claim, the file, the question number, the label, and whether the author wrote a `post` or a `comment`. No item in this pass is `measured`.

## Effort per Model

- Opus 5.5 defaults to "medium", so the subagents it launches inherit that level, and the commenter advises setting "at least 'high' in the definitions of the subagents that use the Sonnet model". `export-Opus 5.5 in Claude Code is crazy fast, especially at spotting UI bugs.jsonl`, Q1, self-report, comment.
- "5.5 in High used roughly 28% of my 5H over 90-ish minutes of work." Same file, Q1, self-report, comment. Another commenter there says users "need to download Claude Code version 2.1.280" for Opus 5.5. The project runs `2.1.311`.
- Opus 5.5 on medium as an orchestrator "only sipped 2 percent of usage" over a night, and "that same job done by previous models would suck down 25 percent in less time". "Bumping to High or Xhigh starts to guzzle tokens." `export-Opus 5.5 at Medium is cheaper and faster than Opus4.6-Fable5.1 at high.jsonl`, Q1, self-report, comment. A reply disagrees: "Cheaper but it works 10x time on something!"
- "I changed it to xhigh and the usage went to the roof." A reply says Anthropic recommends medium as the default, and that higher efforts give "marginally better results while consuming much more usage". Another: "im sticking with high, seemed to last forever". `export-What is wrong with Opus 5.5-.jsonl`, Q1, self-report, comment.
- "High is the new xhigh with 5.5. xhigh was 'I intend max but I can't reasonably afford it'." `export-Token optimization from Anthropic- choosing the right effort level to the task.jsonl`, Q1, self-report, comment. The post body is empty and links to an article that is not in the file.
- Opus 5.5 at `max` reading a repo "costed me 30% of my session limit". `export-Opus 5.5 for planning and implementing -.jsonl`, Q1, self-report, comment.
- A commenter on a Fable 5.1 advisor with Opus 5.5 at `xhigh`: "Token usage didn't go up enough for me to really notice". Another says Max "forces the highest intelligence, instead of allowing varied level" and cites a video. `export-Be careful with Opus 5.5’s confidence.jsonl`, Q1, self-report, comment. The video claim is secondhand.
- A commenter plans with Opus and implements with Sonnet, and is "starting to use Opus 5.5 on low effort instead because it's faster and I trust it more". `export-Low-effort Opus 5.5 appreciation post.jsonl`, Q1, self-report, comment.
- A disagreement on Sonnet against Opus for coding, with no Sonnet 5.5 named. One: "Default-to-Sonnet and escalate-on-failure burns way less usage than starting every session on Opus." Another: "api cost by task for sonnet is higher than for opus". `export-Is Sonnet actually good enough for Claude Code, or do you mostly stick with Opus-.jsonl`, Q1, self-report, comment.
- On the same question with Opus 5.5 on medium: "it's costs way too much to fix and keep rechecking" with Sonnet 5, against "let Opus 5.5 run entirely on medium". Another: "cheaper than sonnet 5 so no need for me to use any other agents". `export-Opus 5.5 for everything, or mixing models across plan - implement - review-.jsonl`, Q1, self-report, comment. The Sonnet is 5, not 5.5.
- No `claude-haiku-5-5` effort figure and no `claude-sonnet-5-5` effort figure was found in these files.

## What Reduces Usage

- "I metered 21 billion tokens of my own Claude Code use and 97 of every 100 were Claude re-reading things it had already read." The change: Haiku and Sonnet build, Opus reviews, and fresh chats. "About a third of what I burned didn't need to happen." `export-Is Sonnet actually good enough for Claude Code, or do you mostly stick with Opus-.jsonl`, Q2, self-report, comment. "Metered" is stated and no method is shown. The model versions are not named.
- On a Pro `$20` plan with Sonnet on High, the author clears context after "one or two" features per session and "virtually never" hits a token limit. `export-Heavy usage use cases.jsonl`, Q2, self-report, post.
- "Last week with a mix of Opus 5 and Fable I used about 2.5B tokens total on my plan, this week I am going to easily crack 5 billion", and calls Opus 5.5 "dramatically cheaper". `export-Aight I get it, Opus 5.5 is actually peak.jsonl`, Q2, self-report, comment.
- A commenter says responses carry all the tokens "(input, output, cache)" including background agents, so a script can log them, and that they "optimized heavily for token usage". `export-I have a huge question about all these posts about usage consumption.jsonl`, Q2, self-report, comment.

## Compaction against Handover

- A disagreement. One: tell Claude to write a handoff, then `/clear`, then read it, "whenever the context window gets above ~30%". Another: "Compacting and using reference documents ... I never have this issue". Another: `/compact` "will does lose detail and why certain decisions were made". `export-Opus 5.5 is the smartest model I've used but it fucking forgets everything 😭.jsonl`, Q3, self-report, comment. No cost figure is given.
- Same file: "Very detailed handoff at 200k consistently and it's solid." Another: "I think a skill can’t persist across a clear. So my /handoff skill writes the handoff.md file and then reminds me to do the other two steps." Q3, self-report, comment.
- A disagreement on `/compact`. One: "Compact is just not a good cmd to use ... much better to just create a hand off, with a fresh session". Another writes a handoff with `/handoff` at about 25% context and resumes in a new session. `export-What’s your most-used Claude prompt that you can’t live without-.jsonl`, Q3, self-report, comment. The thread carries a June 2026 reminder stamp and names no model.

## Context Window

- "Even with a 1 million token window, Opus still only retains ideal performance until it hits ~150K tokens. At 250K-300K the degradation will begin to impact your work in significant ways." The commenter advises not going past 500K. `export-Opus 5.5 is the smartest model I've used but it fucking forgets everything 😭.jsonl`, Q5, self-report, comment. The Opus version is not named.
- The "smart zone" claim attributed to a creator named Matt Pocock: stay near "25% context". `export-What’s your most-used Claude prompt that you can’t live without-.jsonl`, Q5, self-report, comment, and the commenter says "Not sure if it works".

## Subagents

- "Explore agents are limited to haiku and they’re only allowed max of 2 each cause otherwise my budget is shot." `export-How do you keep up with 5+ agents at the same time-.jsonl`, Q6, self-report, comment. This is a number of subagents per agent, not a turn or tool-call limit.
- A disagreement on one loop against several agents. One calls Opus 5.5 "too eager to reach for subagents". Another: "I always use subagents". `export-What is wrong with Opus 5.5-.jsonl`, Q6, self-report, comment.
- On reviews: a fresh reviewer subagent "that only gets the claim and the evidence, not the whole conversation" because "in the same context it mostly agrees with itself". Another keeps the reviewer persistent with its own notes file. `export-Be careful with Opus 5.5’s confidence.jsonl`, Q6, self-report, comment.
- No numeric subagent turn or tool-call limit was found in these files. No figure for work lost at a window boundary was found.

## Prompt and Harness Size

- A disagreement on `CLAUDE.md`. One: remove everything "except for the pointers to where your main folders are", and drop skills, since custom skills "contradict" the newer models. The author with the file says it is "about 100 lines" with no skills, plugins, or MCPs. Another: "I wouldn't gut them. Keep what they say, rewrite how they say it", and a word that "still shows up 235 times in the memory files". `export-OPUS 5.5 IS THE NEW 4.6!.jsonl`, Q7, self-report, comment.

## Settings and Env Levers

- A subagent file with frontmatter `tools: Read, Grep, Glob`, `model: sonnet`, and `effort: medium`, for an agent named `model-advisor`. `export-Is Sonnet actually good enough for Claude Code, or do you mostly stick with Opus-.jsonl`, Q8, self-report, comment. No saving is stated.

## Coverage

Top-level `external/export-*.jsonl` files: 131, by `ls -1 export-*.jsonl | wc -l`. The coverage list of `docs/dossier/exports/part-2.md` names the 12 unread files and gives only a count for the 47 filter-read files. It does not name them. So this pass read every top-level file with no bullet in either earlier dossier, which is 48 files, plus the 12 named unread files. That is 60 files.
Cited: 16. Read with nothing found: 44.
The two scope exclusions were each opened once. `export-I ran Claude Code across all 89 tasks of Terminal-Bench 2.1 ...jsonl` states "Gemini 3.6 Flash High" in its post. `export-Two 5x sub or one 20x sub-.jsonl` is plan choice. Neither holds a Claude 5 number. They were not counted among the 60.
Method: for each of the 60 files I read the post and every comment that held a number with a unit or a topic word, cut to 380 characters. A file with only chatter could hold an unread comment.
Cited files:

- `export-Opus 5.5 in Claude Code is crazy fast, especially at spotting UI bugs.jsonl`
- `export-Opus 5.5 at Medium is cheaper and faster than Opus4.6-Fable5.1 at high.jsonl`
- `export-What is wrong with Opus 5.5-.jsonl`
- `export-Token optimization from Anthropic- choosing the right effort level to the task.jsonl`
- `export-Opus 5.5 for planning and implementing -.jsonl`
- `export-Be careful with Opus 5.5’s confidence.jsonl`
- `export-Low-effort Opus 5.5 appreciation post.jsonl`
- `export-Is Sonnet actually good enough for Claude Code, or do you mostly stick with Opus-.jsonl`
- `export-Opus 5.5 for everything, or mixing models across plan - implement - review-.jsonl`
- `export-Heavy usage use cases.jsonl`
- `export-Aight I get it, Opus 5.5 is actually peak.jsonl`
- `export-I have a huge question about all these posts about usage consumption.jsonl`
- `export-Opus 5.5 is the smartest model I've used but it fucking forgets everything 😭.jsonl`
- `export-What’s your most-used Claude prompt that you can’t live without-.jsonl`
- `export-How do you keep up with 5+ agents at the same time-.jsonl`
- `export-OPUS 5.5 IS THE NEW 4.6!.jsonl`

Read with nothing found: 44 files, being the other 44 of the 60. They hold praise, complaint, or topics off the eight questions. Two were read and set aside for a stated reason. `export--Claude reached its tool-use limit- ...jsonl` gives "roughly 20 tool calls", but it is about the `claude.ai` chat and not Claude Code. `export-Those of you actually using Haiku regularly- what am I missing-.jsonl` names no Haiku version and no effort setting.
Top-level files still unread: none. Every top-level file has now been opened. The top level is not fully read, because the 60 files of this pass were read through the filter above.

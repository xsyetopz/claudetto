# Goal

History, checks and sources: [evidence/goal.md](evidence/goal.md).

## GOAL-001 Register the Goal Tools

claudetto registers `get_goal`, `set_goal`, `pause_goal` and `clear_goal` for the interactive main loop and sends `isOffered: false` for the built-in `SetGoal`, `PauseGoal` and `GetGoal`.

Given the interactive main loop
When the tool list is built
Then each goal tool description is at most 200 characters
And the built-in goal tool names are withdrawn

## GOAL-002 End a Goal only with Evidence

`clear_goal` ends a goal only with evidence and echoes an accepted claim to the user through `$.ui`.

Given the last cited check failed, or a check cited as passed has no Bash run of that exact command with a result in the transcript
When the agent calls `clear_goal`
Then the call is refused

Given a check was rerun and passed
When the agent calls `clear_goal`
Then the claim is accepted
And it is echoed to the user through `$.ui`

## GOAL-003 Run Goal Tools without an Ask

`get_goal`, `pause_goal` and `clear_goal` run without the engine's ask for an MCP tool unless a settings rule decides, `pause_goal` sits in the prompt, and a Stop-hook block of a goal the model paused or cleared ends the main turn.

Given a goal whose last step only the user holds
When the agent works on it
Then claudetto ends the turn in fewer blocks than vanilla

Given a goal the agent can finish
When the agent works on it
Then it calls no `pause_goal`

## GOAL-010 Warn About a Missing Path at Set Time

`/goal <condition>` that names a path missing from the session directory warns the user at set time and still sets the goal.

Given `/goal <condition>` naming a missing path
When the goal is set
Then a warning shows and the goal is set

Given `/goal <condition>` naming an existing path
When the goal is set
Then no warning shows

## GOAL-020 Note the Stop-Block Cap

claudetto counts the stop blocks of each goal and adds a note to the feedback row two blocks before the cap, naming the cap and that the goal then pauses.

Given a goal two blocks before the cap
When the feedback row is written
Then it holds the note

Given a goal earlier than that
When the feedback row is written
Then it holds no note
And the cap comes from `CLAUDE_CODE_STOP_HOOK_BLOCK_CAP` (default 8)

## GOAL-031 Name a Path Removed After the Goal Was Set

claudetto adds the missing-path note to each stop-block feedback row while a path the goal names is missing, so a path removed after set time reaches the model.

Given a goal whose named path existed at set time and was removed after
When the goal blocks the stop
Then the feedback row names the missing path

## GOAL-032 Pause the Goal at the Block Cap

claudetto pauses the goal and ends the turn when its stop blocks in a row reach the cap, so the loop stops at the cap and the condition stays for `get_goal` and a later `/goal`.

Given a goal one block below the cap
When the goal blocks the stop again
Then the goal is paused and the main turn ends

Given a goal more than one block below the cap
When the goal blocks the stop
Then the goal stays active and the turn goes on

## GOAL-033 Track a Goal Set Before the Plugin Loaded

claudetto takes a goal it did not see set, such as a `/goal` in the launch prompt, from the goal's first Stop-hook block, so `get_goal`, `pause_goal` and `clear_goal` act on it.

Given a goal claudetto did not see set
When the goal blocks the stop and the engine's `goal_status` row follows
Then `pause_goal` pauses it and `clear_goal` with backed checks ends it

Given a settings Stop hook that blocks the stop
When no `goal_status` row follows
Then no goal is tracked

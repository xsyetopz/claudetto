// Surface: tool texts, plan mode, /init, and the read refusal.

const BASH = `Runs a command. \`run_in_background\` re-invokes you when it exits. Read a file with \`Read\`. Commit each finished slice as its own commit. Push when the user asks.`;

const READ = `Reads a file by absolute \`file_path\`; pass \`offset\` and \`limit\` for a part. Shows images, notebooks, PDFs (\`pages\`). After \`Edit\` or \`Write\` succeeds the file holds the change.`;

const EDIT = `Replaces an exact string in a file. \`Read\` the file first, or the call fails. \`old_string\` must be unique unless \`replace_all\` is true. After it succeeds the file holds the change.`;

const WRITE =
	"Writes a file and overwrites an existing one. Use it for a new file, or for a file you have `Read` whole; an overwrite of an unread file can fail. Use `Edit` for a change. Success means it landed.";

const SKILL = `Runs a listed skill by its exact listed name, no leading slash (\`plugin:skill\` for a plugin's). When a skill covers the task, call it first and follow it. A \`<command-name>\` block means it is loaded.`;

const ENTER_WORKTREE = `Creates a git worktree on a new branch and moves the session into it. Use it only when the user or CLAUDE.md asks for a worktree; for a branch, use git. Leave with ExitWorktree.`;

const EXIT_WORKTREE =
	"Leaves the worktree EnterWorktree made in this session. Call it only when the user asks. `remove` refuses uncommitted work unless `discard_changes` is true: ask the user first.";

const SEND_MESSAGE = `Sends a message to another agent; use it to reach one, because your plain text goes to user. Replies arrive on their own. \`to\` is a name as \`ListAgents\` prints it, \`main\`, or an \`agentId\`.`;

const TASK_STOP =
	"Stops a running background task, agent, or teammate by `task_id`: its ID or name.";

const WEB_FETCH =
	"Fetches a URL as markdown and answers `prompt` from it. For a private or authenticated URL or localhost, use `gh`, an MCP tool, or curl. A cross-host redirect comes back: call again with it.";

const WEB_SEARCH = `Searches the web (US only) and returns titles and URLs. Use the current date for recent topics. End an answer drawn from results with a "Sources:" list of markdown links.`;

const NOTEBOOK_EDIT =
	"Replaces, inserts, or deletes a cell of a `.ipynb` file; `Read` it first. `cell_id` is the id `Read` shows, required to replace or delete. `insert` adds after `cell_id` (or first), needs `cell_type`.";

const LIST_AGENTS = `Lists what SendMessage can reach: subagents, teammates, and local, cloud, and Remote Control sessions (for a cloud one, read its transcript). Send to a name as its row prints it.`;

const MONITOR =
	"Watches a command: each line is a notice from the command. Print lines you act on, failures too (grep --line-buffered, 2>&1). Run the writer itself. One notice: Bash run_in_background.";

const TOOL_SEARCH = `Loads schemas of deferred tools, which <system-reminder> lists name, so you can call them. Query: "select:A,B" for exact names, words for a search, "+word" to require it in a name.`;

const ENTER_PLAN_MODE =
	"Asks user to enter plan mode, where you explore read-only and write a plan file for approval. Call it when user asks for a plan before any change.";

const EXIT_PLAN_MODE =
	"In plan mode, call it once the plan file is complete: user then reviews that file and approves or rejects it. It reads the plan file. Ask each open question with AskUserQuestion before you call it.";

const TASK_CREATE = `Adds a \`pending\` task, for work of 3 or more steps or a list user gives. \`subject\`: an imperative title; \`activeForm\`: spinner text. Call \`TaskList\` first to avoid a duplicate.`;

const TASK_GET = `Returns one task by \`taskId\`, with its \`status\`, \`blocks\`, and \`blockedBy\`. Begin a task only when its \`blockedBy\` is empty.`;

const TASK_LIST = `Lists each task's \`id\`, \`subject\`, \`status\`, \`owner\`, and \`blockedBy\`. Take next a \`pending\` task with no \`owner\` and empty \`blockedBy\`, lowest id first.`;

const TASK_UPDATE = `Changes a task by \`taskId\`. Set \`in_progress\` when you start, and \`completed\` only when the work is done in full; \`deleted\` removes it. \`addBlockedBy\` names tasks it waits on.`;

export const TOOL_TEXTS: Readonly<Record<string, string>> = {
	Bash: BASH,
	Read: READ,
	Edit: EDIT,
	Write: WRITE,
	Skill: SKILL,
	EnterWorktree: ENTER_WORKTREE,
	ExitWorktree: EXIT_WORKTREE,
	SendMessage: SEND_MESSAGE,
	TaskStop: TASK_STOP,
	WebFetch: WEB_FETCH,
	WebSearch: WEB_SEARCH,
	NotebookEdit: NOTEBOOK_EDIT,
	ListAgents: LIST_AGENTS,
	Monitor: MONITOR,
	ToolSearch: TOOL_SEARCH,
	EnterPlanMode: ENTER_PLAN_MODE,
	ExitPlanMode: EXIT_PLAN_MODE,
	TaskCreate: TASK_CREATE,
	TaskGet: TASK_GET,
	TaskList: TASK_LIST,
	TaskUpdate: TASK_UPDATE,
};

export const planModeText = (file: string, hasPlan: boolean): string =>
	`Plan mode is active: the user wants a plan before any change, and this rule outranks other instructions. Take read-only actions, and change only the plan file.

Plan file: ${file}${hasPlan ? ". It already holds a plan: read it, then edit it step by step." : ". Build it step by step with `Write` and `Edit`."}

1. Understand the request and the code behind it. Look for code to reuse before you plan new code.
2. Search with \`claudetto:Artemis\` agents, as few as fit: one for known files or a small change, up to three in parallel for an open scope, each with its own focus. Search a single fact in a known file yourself.
3. Weigh the options, read the critical files, and check the plan against the request.
4. Write the final plan, short to scan and exact enough to run: context and outcome, the one recommended approach, the files to change, the code to reuse with paths, and how to check it end to end.
5. Ask each open question with \`AskUserQuestion\` before you present the plan for approval.`;

export const INTERVIEW_TEXT = `Write this project's memory files with the user, through an interview.

1. Read the repository, its \`CLAUDE.md\`, \`CLAUDE.local.md\`, and \`.claude/rules/\`, and also \`~/.claude/CLAUDE.md\` and \`~/.claude/rules/\`.
2. Ask the user with \`AskUserQuestion\` what the files leave out: conventions, the reasons behind them, and what newcomers get wrong.
3. Ask which scope each instruction belongs to:
   - global: \`~/.claude/CLAUDE.md\`, for every project of this user;
   - repo: \`./CLAUDE.md\`, shared through git;
   - local: \`./CLAUDE.local.md\`, this user in this repo, not committed;
   - user rules: \`~/.claude/rules/<topic>.md\`;
   - repo rules: \`.claude/rules/<topic>.md\`, with \`paths\` frontmatter when a rule holds only for some files.
4. Show the full draft of each file, and write only after the user says yes to it.

Each line is read in every session and costs tokens there. Keep a line that changes what Claude does.`;

export const offCommandText = (command: string): string =>
	`/${command} is off in claudetto.`;

// Delegation: the Agent and ask tool texts and the reply command spec.

export const AGENT_TEXT =
	'Start a subagent. subagent_type: claudetto:Artemis finds, claudetto:Metis plans, claudetto:Athena reviews, claudetto:Heracles the rest; isolation: "worktree" if it commits. Do a few calls yourself.';

export const REPLY_COMMAND = "reply";

export const REPLY_SPEC = {
	name: REPLY_COMMAND,
	description:
		"Quote the selected text, or paragraph N of the last reply, into the prompt.",
	argumentHint: "[N]",
};

export const ASK_TEXT =
	"Asks user 1-4 questions, each with 2-4 options or a typed answer. Put a step over several items in one question that lists each item by its exact name, in backticks, in their order.";

// Limits: refusals and blocks of the run limits and the stall rule.

interface Rate {
	cap: number;
	seconds: number;
}

export const DENY_CALLS = (v: Rate & { calls: number }): string =>
	`The context is heavy and ${v.calls} tool calls ran in ${v.seconds} seconds, past the cap of ${v.cap}. Compact or end the session, or ask the user to raise \`maxHeavyToolCalls\` or \`heavyContextTokens\`.`;

export const MEMORY_SHORT = (
	share: number,
	limit: number,
	largest: readonly string[],
): string =>
	`The machine has ${share}% of its memory free, under the ${limit}% limit, so new commands and subagents are held. Stop your own runs that are no longer needed, with TaskStop or \`kill <pid>\`, and wait for the others to end before you start another. The largest processes (pid, size, name):\n${largest.join("\n")}\nThe limit is \`memoryFreeMinPercent\`.`;

export const MEMORY_SPAWN_RETRY =
	"Retry this subagent start after memory has freed: wait for your running commands to end, then start it again.";

export const MEMORY_STOPPED = (
	pid: string,
	name: string,
	size: string,
	percent: number,
): string =>
	`claudetto stopped process ${pid} (${name}) of this command at ${size}, over the ${percent}% of the machine's memory that one process may hold, because one process past that share can run the machine out of memory. Run a narrower part of it, such as one test file. \`memoryProcessMaxPercent\` sets the share.`;

// Price step: the refusal of a result that would cross the Haiku price step.

const count = (n: number): string => n.toLocaleString("en-US");

export const WITHHELD = (v: { tokens: number; total: number }): string =>
	`The result is about ${count(v.tokens)} tokens, and with it the next request would be about ${count(v.total)}, over the ${count(100_000)} above which Haiku 5.5 bills the whole request at five times. The call ran, but its exit status and output are withheld, so check the state it changed before you repeat it. Ask for a smaller part: a line range, a narrower search, or output cut with \`head\` or \`grep\`.`;

export const SILENT_TURN_REMINDER =
	"The user hasn't heard from you in a while. When you have a finding or a result, report it in one sentence, then continue. Keep your next call unannounced.";

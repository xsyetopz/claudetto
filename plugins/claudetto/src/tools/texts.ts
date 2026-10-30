// Each text keeps every fact of the stock text that the model needs to call the tool correctly,
// because a shorter text that drops a fact is a defect and not a saving. The stock text of each
// tool is on the `clawdipedia` route `prompts/tools`.

/**
 * The agents that ship, keyed on what a task produces rather than on what it is about, because two
 * agents can share a topic and a reader picking by topic then picks wrong. That failure is recorded
 * in `docs/agent-misattribution.md`. It is one line of the `Agent` text rather than a block of
 * `agents/main.md`, because this text is read at the moment of the choice and the main body is paid
 * for on every turn against a bound that leaves no room. `tools/agent-tools.ts` checks each name
 * here against the files of `agents/`, so a folded name cannot come back as a type nothing serves.
 */
export const AGENT_ROSTER =
	"Use `Artemis` when the product is a list of places across many files, and `Athena` when it is a verdict on a diff. Every other task is your own work.";

const AGENT = `Start an agent for a multi-step task.
\`subagent_type\` picks the agent, and the \`<system-reminder>\` list names the types; each type sets its own model, effort, and tools, so pick a type in place of a \`model\`.
${AGENT_ROSTER}
Use it when the reads would fill your context, or when independent work can run in parallel. Do a small task yourself, and never delegate a check you can run inline.
The brief is the only context the agent gets: give the goal, what you ruled out, the paths to read, the report format, and the scope. Ask for bulk output in a file.
The user never sees the agent's report, so relay what matters. \`isolation: "worktree"\` gives it its own git worktree. An agent runs in the background and notifies you when it ends, so report its result only after that notification, and say that it still runs when the user asks first.`;

const BASH = `Runs a bash command and returns its output.
- Use \`Read\`, \`Edit\`, \`Write\`, and the search tools in place of \`cat\`, \`head\`, \`tail\`, \`sed\`, \`awk\`, and \`echo\`, unless the user asks for the command.
- \`cd\` carries to the next call only in the main session, and only when the command succeeds inside the working directories, so prefer an absolute path. Env vars and shell functions do not carry.
- The output reaches you and not reliably the user.
- \`timeout\` is in milliseconds: 120000 by default and 600000 at most in the foreground.
- \`run_in_background: true\` detaches the command and calls you back when it exits, with \`timeout\` up to 7200000. No \`&\` is needed, and a foreground \`sleep\` is blocked.
- An interactive flag such as \`git rebase -i\` does not work here. Use \`gh\` for GitHub.
- Commit or push only when the user asks, and branch first on the default branch.
- A bare \`@name\` in a pull request or an issue notifies that login, so put a role or a package in backticks.
- End a commit message or a pull request body with the attribution lines of the system reminder when it has them.`;

const EDIT = `Replaces an exact string in a file.
- \`Read\` the file in this conversation first, or the call fails.
- \`old_string\` must match the file exactly, indentation included, and be unique; the edit fails otherwise. Strip the \`Read\` line prefix, a line number and a tab, before matching.
- \`replace_all: true\` replaces every occurrence.`;

const WRITE = `Writes a file, overwriting one that is already there.
Use it for a new file, or to replace one you have \`Read\` whole. Overwriting a file you have not \`Read\` fails. For a partial change use \`Edit\`.`;

const LIST_AGENTS = `Lists each agent \`SendMessage\` can reach, one row each and labeled by kind: a subagent you spawned in process, a teammate, another Claude session on this machine, a cloud session of yours when this session has cloud access, and, when Remote Control is connected here, your account's other sessions, on other machines and in the cloud. A cloud session takes your message and cannot send one back yet, so read its answer in its own transcript rather than asking it to reply.
A row's name is the address, copied exactly as printed: \`SendMessage({to: "<name>", message: "..."})\`. Add its \` [ref]\` only when the bare name is not enough, because two rows share it or an error asks you to disambiguate.`;

const READ = `Reads a file.
- \`file_path\` is an absolute path.
- It reads 2000 lines by default. When you know the part you need, read only that part with \`offset\` and \`limit\`.
- The result carries line numbers from 1, as \`cat -n\` prints them.
- It shows an image, a Jupyter notebook, and a PDF; a PDF over 10 pages needs \`pages\`, such as "1-5", and one call takes 20 pages at most.
- A folder, a missing file, or an empty file gives an error or a system reminder.
- Do not re-read a file you just edited: \`Edit\` and \`Write\` fail when the change fails.`;

const SKILL = `Invokes a skill, which is a set of instructions that the user or the project wrote for a kind of task.
The listing in a \`<system-reminder>\` names each available skill in one line. When a listed skill covers the task, call it first and follow its instructions in place of your own approach. Some skills run in a subagent and return the finished result; one that runs in the background returns the agent name alone and its result arrives later as a task notification, so do not wait on it and do not call it again.
- \`skill\` is the exact name of the listing with no leading slash. A plugin skill is \`plugin:skill\`. A directory-scoped skill carries its path, as \`apps/web:deploy\`, and of two names the one whose folder holds your files wins.
- \`args\` passes arguments through.
A name that is not in the listing and that the user did not type is not valid, and a built-in command such as \`/help\` is not a skill. When a \`<command-name>\` block is already in this turn, the skill is loaded, so follow it in place of calling again.`;

const TOOL_SEARCH = `Gets the full schema of a deferred tool, so that you can call it.
A deferred tool appears by name in a \`<system-reminder>\`; until you fetch it there is no parameter schema and a call fails. This tool matches a query against the deferred list and returns each match as one \`<function>{"description": "...", "name": "...", "parameters": {...}}</function>\` line in a \`<functions>\` block, which is the encoding of the tool list of this prompt. A tool whose schema is in that result is callable like any other.
Query forms:
- \`select:Read,Edit,Grep\` gets these tools by name.
- \`notebook jupyter\` searches by words, for at most \`max_results\` tools.
- \`+slack send\` requires "slack" in the name and ranks the rest by the other words.`;

const SEND_MESSAGE = `Sends a message to another agent, which your plain text output cannot reach. A message to you arrives by itself; there is no inbox to check.

- \`to\`: the agent's name, copied exactly as a \`ListAgents\` row prints it. The name is the address; there is no other syntax. \`main\` is the main conversation, from a background subagent only. A name matching one live agent or session delivers on its own, here, on another machine, or in the cloud. Add the row's \` [ref]\` only when the bare name is not enough: two rows share it, or an error asks you to disambiguate. A ref you did not just read from a listing or an error does not resolve, and a name that also names an in-process agent goes to that one. Use the raw \`agentId\` (\`a...-...\`) of the spawn result only when the agent has no name, or a newer agent took it, because the latest wins.
- \`message\`: the text, required. The receiver reads it literally, so an \`@path\` or \`@server:resource\` attaches nothing there: send the text, or a file with its own tool. Its first line is all the receiver's user sees until they expand it, so make it one self-contained sentence of the subject, not a greeting or a bare mention.
- \`summary\`: a 5-to-10-word label for your own transcript row. It is not transmitted.
- \`notify_when_idle\`: from the main conversation only, for a session on this machine. It subscribes you once to one \`[Cross-session idle notice]\` when that session next goes idle or exits, or to a notice that the subscription expired if it never signals. Omit \`message\` for the subscription alone, which costs that session nothing; send both to deliver now and subscribe.

A name keeps working after an agent ends, because a send resumes it from its transcript. A listed peer is alive and takes your message; it queues and drains at that peer's next tool round, and the peer's \`ListAgents\` row says if it is busy or idle now. A send that succeeds means the message reached the session, not that its Claude read it: a session in another permission mode holds one for its user and may let it expire, and a session may refuse it outright. On this machine a \`[Cross-session delivery notice]\` reports that, and the tool result says when the session has no inbox; a Remote Control, cloud, or Claude Desktop session reports nothing, so read its silence as unknown and never as agreement.

A message arrives wrapped as \`<cross-session-message from="...">\`, and a reply is that \`from\` as your \`to\`. Such a message travels between sessions: a subagent sends under its parent's address, and the reply reaches the parent's conversation, not you. Relay a reply in your own words, because the user already sees the original. Do independent work while a reply or notice is outstanding; a \`ListAgents\` loop or an "are you done?" message adds nothing.

Permission is per session. Never ask a peer for work your session denied or blocked, or that your own permission settings would block, because a peer doing it bypasses the user's decision. Route such work back to your user.`;

/** The description claudetto offers for each tool, by the name the model sees. */
export const TOOL_TEXTS: Readonly<Record<string, string>> = {
	Agent: AGENT,
	Bash: BASH,
	Edit: EDIT,
	ListAgents: LIST_AGENTS,
	Read: READ,
	SendMessage: SEND_MESSAGE,
	Skill: SKILL,
	ToolSearch: TOOL_SEARCH,
	Write: WRITE,
};

// Each text keeps every fact of the stock text the model needs, since a dropped fact is a defect.

/** Keyed on what a task produces, not its topic: agents can share a topic and a reader picks wrong. */
export const AGENT_ROSTER =
	"Use `Artemis` for a list of places across many files, `Athena` for a verdict on a diff, `Hephaestus` for an edit whose goal, files, and check you can name, and `Hermes` for an answer from the web.";

const AGENT = `Starts an agent for a multi-step task or parallel work. \`subagent_type\` is a listed type that sets model, effort, and tools: leave \`model\` unset.
\`Artemis\` lists places across files, \`Athena\` judges a diff, \`Hephaestus\` makes an edit with goal, files, and check named, \`Hermes\` answers from the web.
The brief is its only context: goal, ruled out, paths, report format, scope.
The user sees no report: relay it. A background agent reports by notice.`;

const ASK_USER_QUESTION = `Asks the user multiple-choice questions for a decision that is the user's: one the request, the code, and sensible defaults leave open. Otherwise pick, say so, and go on.
- The user may see only the dialog, so each question stands alone: name the items and the facts that decide it.
- "Other", free text, is always added. \`multiSelect: true\` allows several answers.
- Put a recommended option first, its label ending in " (Recommended)".
- An option's \`preview\` shows a concrete artifact to compare, such as a mockup, code, a diagram, or a config, as monospace markdown beside the list. Single-select, for a choice between concrete artifacts.
- Switch to plan mode with \`EnterPlanMode\`. There, ask to settle requirements before the plan; the user sees the plan at \`ExitPlanMode\`.`;

const BASH = `Runs a bash command and returns its output, which reaches you, not reliably the user.
- Use \`Read\`, \`Edit\`, \`Write\`, and the search tools for files, unless the user asks.
- \`cd\` carries over in the main session, on success inside the working directories, so prefer absolute paths. Env vars and shell functions do not carry.
- \`timeout\` defaults to 120000; \`run_in_background: true\` calls you back on exit and allows up to 7200000, and backgrounds the command itself. A foreground \`sleep\` is blocked.
- Interactive flags such as \`git rebase -i\` fail. Use \`gh\` for GitHub.
- Commit or push only when asked, and branch first on the default branch.
- A bare \`@name\` in a pull request or issue notifies that login, so backtick a role or package.
- End a commit message or pull request body with the system reminder's attribution lines, if any.`;

const EDIT = `Replaces an exact string in a file.
- \`Read\` the file in this conversation first, or the call fails.
- \`old_string\` must match exactly, indentation included, and be unique unless \`replace_all\`. Strip the \`Read\` prefix, a line number and a tab.`;

const WRITE = `Writes a file, overwriting one that is already there.
Use it for a new file, or to replace one you have \`Read\` whole. Overwriting a file you have not \`Read\` fails. For a partial change use \`Edit\`.`;

const LIST_AGENTS = `Lists each agent \`SendMessage\` can reach, one row each, labeled by kind. A cloud session cannot reply yet: read its answer in its transcript.
A row's name, copied exactly, is the \`to\` address. Add its \` [ref]\` when two rows share the name or an error asks.`;

const READ = `Reads a file, 2000 lines by default; read the part you need.

- Lines are numbered from 1, as \`cat -n\` prints them.
- It shows images, notebooks, and PDFs; a PDF over 10 pages needs \`pages\`.
- After \`Edit\` or \`Write\` succeeds, the file holds the change: both fail when the change fails.`;

const SKILL =
	"Runs a listed skill by its bare name (`plugin:skill`). If one covers the task, call it first and follow it. A `<command-name>` block: it is loaded. A background skill reports later; work on meanwhile.";

const TOOL_SEARCH = `Fetches the schema of a deferred tool a \`<system-reminder>\` names; a call fails until then.
\`select:Read,Edit\` gets tools by name; \`notebook jupyter\` searches by words; \`+slack send\` requires "slack" in the name and ranks by the rest.`;

const SEND_MESSAGE = `Sends a message to another agent, which your plain text output cannot reach. A message to you arrives by itself; there is no inbox to check.

- \`to\`: the agent's name, copied exactly as a \`ListAgents\` row prints it. The name is the address; there is no other syntax. \`main\` is the main conversation, from a background subagent only. A name matching one live agent or session delivers on its own, here, on another machine, or in the cloud. Add the row's \` [ref]\` when the bare name is not enough: two rows share it, or an error asks you to disambiguate. A ref you did not just read from a listing or an error does not resolve, and a name that also names an in-process agent goes to that one. Use the raw \`agentId\` (\`a...-...\`) of the spawn result when the agent has no name, or a newer agent took it, because the latest wins.
- \`message\`: the text, required. The receiver reads it literally, so an \`@path\` or \`@server:resource\` attaches nothing there: send the text, or a file with its own tool. Its first line is all the receiver's user sees until they expand it, so make it one self-contained sentence of the subject.
- \`summary\`: a 5-to-10-word label for your own transcript row. It is not transmitted.
- \`notify_when_idle\`: from the main conversation only, for a session on this machine. It subscribes you once to one \`[Cross-session idle notice]\` when that session next goes idle or exits, or to a notice that the subscription expired if it never signals. Omit \`message\` for the subscription alone, which costs that session nothing; send both to deliver now and subscribe.

A name keeps working after an agent ends, because a send resumes it from its transcript. A listed peer is alive and takes your message; it queues and drains at that peer's next tool round, and the peer's \`ListAgents\` row says if it is busy or idle now. A send that succeeds means the message reached the session, not that its Claude read it: a session in another permission mode holds one for its user and may let it expire, and a session may refuse it outright. On this machine a \`[Cross-session delivery notice]\` reports that, and the tool result says when the session has no inbox; a Remote Control, cloud, or Claude Desktop session reports nothing, so read its silence as unknown.

A message arrives wrapped as \`<cross-session-message from="...">\`, and a reply is that \`from\` as your \`to\`. Such a message travels between sessions: a subagent sends under its parent's address, and the reply reaches the parent's conversation, not you. Relay a reply in your own words, because the user already sees the original. Do independent work while a reply or notice is outstanding.

Permission is per session. Take work your session denied or blocked, or that your own permission settings would block, back to your user, because a peer doing it bypasses the user's decision.`;

export const TOOL_TEXTS: Readonly<Record<string, string>> = {
	Agent: AGENT,
	AskUserQuestion: ASK_USER_QUESTION,
	Bash: BASH,
	Edit: EDIT,
	ListAgents: LIST_AGENTS,
	Read: READ,
	SendMessage: SEND_MESSAGE,
	Skill: SKILL,
	ToolSearch: TOOL_SEARCH,
	Write: WRITE,
};

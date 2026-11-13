// Decide: the tool Jev answers through, and its replies.

const DECIDE_TOOL = "decide";

// `mcp__<plugin>__<name>` with plugin `claudetto`.
export const DECIDE_CALL = "mcp__claudetto__decide";

const DECIDE_INPUT_SCHEMA: Record<string, unknown> = {
	type: "object",
	properties: {
		questions: {
			type: "array",
			minItems: 1,
			description:
				"The decisions you want Jev to take. A question with two or more options is a choice; a question with no options is a yes/no question.",
			items: {
				type: "object",
				properties: {
					question: {
						type: "string",
						description:
							"The decision, with each fact that settles it and its source: Jev reads no file or session. The text goes to the TypeSafe API, so keep secrets and personal data out.",
					},
					options: {
						type: "array",
						items: {
							type: "object",
							properties: {
								label: { type: "string" },
								description: { type: "string" },
							},
							required: ["label", "description"],
						},
					},
				},
				required: ["question"],
			},
		},
	},
	required: ["questions"],
};

const DECIDE_DESCRIPTION = `Asks Jev, a TypeSafe model, to settle a decision that is yours, not the user's, when no repository fact settles it and waiting would stop the work. A dialog for the user stays with the user.`;

export const DECIDE_SPEC = {
	name: DECIDE_TOOL,
	description: DECIDE_DESCRIPTION,
	inputSchema: DECIDE_INPUT_SCHEMA,
};

export const JEV_GIVE_BACK =
	"Decide each question with no answer yourself and state the assumption, or put it to the user with `AskUserQuestion`.";

export const ASK_FIX_DENIED =
	"This question asks leave to fix a defect you found or caused. A fix of your own defect needs no leave: make it, run its check, and report it. Ask only for a choice that is the user's, such as a design, a scope, a cost, or a risk.";

export const jevSilent = (question: string): string =>
	`Jev gives no answer to "${question}".`;

export const jevSaid = (question: string, said: string, p: number): string =>
	`Jev ${said} for "${question}" (probability ${p.toFixed(2)}).`;

export const jevFailed = (why: string): string => `Jev gives no answer: ${why}`;

// Secrets: the scanner that redacts tool results.
export const secretScanFailed = (why: string): string =>
	`The secret scanner \`betterleaks\` failed, so this text was withheld (${why}). Install it with \`brew install betterleaks\`, or run \`/claudetto:setup\`.`;

// Gate: refusals of a shell command or a file write.
export const GATE_READ_FILE = (
	file: string,
	range?: { offset: number; limit: number },
): string =>
	`Use \`Read\` to read a file, not the shell: call \`Read\` with \`file_path\` \`${file}\` (absolute), ${
		range
			? `\`offset\` ${range.offset}, and \`limit\` ${range.limit}.`
			: "and `offset` and `limit` for a part."
	} The command did not run.`;
/** The deny for a switch, checkout, hard reset, or rebase that would rewrite files the sandbox keeps the agent from writing. */
export const gateProtectedMove = (files: readonly string[]): string =>
	`This command would rewrite files the sandbox denies you write to, so git would stop partway and leave the tree half moved:\n${files.map((f) => `- \`${f}\``).join("\n")}\nNothing ran. Ask the user to run the command as \`! <command>\`, or to commit or set aside these files first.`;
export const GATE_EDIT_FILE = (file: string): string =>
	`Use \`Edit\` to change a file, not the shell: call \`Edit\` on \`${file}\` (absolute path). The command did not run.`;
export const GATE_WRITE_FILE =
	"Use `Write` to write a whole file, not the shell.";
export const GATE_MASKED_EXIT =
	"A pipe returns its last command's exit code, so a failing check piped into `tail`, `head`, or `grep` reads as a pass and lets later steps run. Start the command with `set -o pipefail;`, or send the output to a file and print `$?`. The command did not run.";
export const GATE_UNSTOPPED_COMMIT =
	"A `git commit` after a check that `;`, a newline, `||`, or a loop leaves running commits after a failure. Tie the commit to the check with `&&`, start the script with `set -e`, or end the check with `|| exit 1`. The command did not run.";
export const GATE_WHOLE_FORMAT =
	"A formatter run over the whole repository rewrites files outside the task. Pass the files you changed, or use `--check`, `--staged`, or `--changed`. The command did not run.";
export const GATE_SYSTEM_WRITE = "This call writes to a system folder.";
export const GATE_HOOK_WRITE =
	"This command changes a plugin's hooks folder, and a hook is a gate on the agent.";
export const GATE_UNREADABLE =
	"The gate cannot read this command, so a person must approve it.";
export const GATE_RECREATE =
	"This file existed earlier in this session and is gone now, and no call of this session removed it, so it was removed outside this session. Recreating it may undo the user's own deletion. Ask the user first.";
export const GATE_READ_ONLY =
	"claudetto: a read-only command runs with no prompt.";
export const gateRule = (reason: string | undefined, rule: string): string =>
	`${reason ?? "This call is denied."} The rule \`${rule}\` denies it.`;
export const GATE_KILL_BROAD =
	"`pkill` and `killall` stop every process with a matching name, and some of those were not started by this session. Stop a background task with `TaskStop`, or run `kill <pid>` on a pid that an earlier command of this session printed after it started the process in the background.";
export const gateKillPid = (
	pid: string,
	started: readonly string[] = [],
): string =>
	`${pid} is not a process this session started: no earlier result of this session shows a background command that printed it. Leave it running. Stop only what this session started, with \`TaskStop\` or \`kill <pid>\` of a pid its own command printed. ${
		started.length === 0
			? "Your own commands have started no process yet."
			: `Your own commands started these pids: ${started.join(", ")}.`
	}`;
export const gateWalled = (path: string, wall: string): string =>
	`${path} is under \`${wall}\`, which the user walled off. Do not read, list, or search it by any tool, command, or other route. If a count or a fact about it is needed, ask the user to run their own \`! <command>\` and tell you the result.`;
export const walledUnguarded = (walls: readonly string[]): string =>
	`claudetto walls off ${walls.map((w) => `\`${w}\``).join(", ")}, but your settings hold no ${walls.map((w) => `\`Read(${w}/**)\``).join(", ")} in \`permissions.deny\`, so only claudetto's gate keeps sessions out.`;
export const gateRmTmp = (path: string): string =>
	`\`${path}\` names a temp base or leaves one through \`..\`, and a base holds every session's files. Remove the folder you made by its literal path, as \`rm -rf /tmp/<name>\`. Claude Code's own check denies a target that ends in \`$dir/\` or \`$dir/*\` or is a \`$(...)\`, and no rule allows it.`;
export const CLEANUP_LEFT = (left: readonly string[]): string =>
	`claudetto removed the worktrees and branches this agent created and no longer needs. These stay because they hold work: ${left.map((item) => `\`${item}\``).join(", ")}. A worktree has uncommitted changes, or a branch has commits the current branch lacks or is checked out in such a worktree. In your reply, list each of these paths and branches by name with what it holds, so the user can merge or drop it.`;
export const STALE_TASKS = (lines: readonly string[]): string =>
	`These background tasks of this agent still run, and once it stops nothing reads them; a monitor that outlives the reply wakes the session later with nothing to do:\n${lines.join("\n")}\nStop each with \`TaskStop\`. If your next step waits on one, name its id in your reply with what you wait for.`;
export const gateWorktreeRemove = (path: string): string =>
	`${path} is not a worktree this session created: Claude Code made no worktree of that name in this session, for an agent with isolation or for EnterWorktree. Leave it. Remove only a worktree Claude Code made in this session, or ask the user to remove this one.`;
export const GIT_CLOSED =
	'Sandbox set its rules for `.git` when this session started, and this folder held no repository then, so each git write here fails inside sandbox with "Operation not permitted" until Claude Code restarts. Tell user once to restart Claude Code in this folder with `claude --continue`. Until then, run each git write with `dangerouslyDisableSandbox: true`.';
export const GATE_ENDLESS_WAIT =
	"This background loop waits with no time limit, so it runs forever if what it waits for never comes, as a loop that counts successes does when one job fails. Give it a limit and an exit on failure: test `$SECONDS` in its condition, as in `until check || [ $SECONDS -gt 1800 ]; do sleep 30; done`, or wrap it in `timeout <seconds>`, and break as soon as a failure shows.";
export const GATE_BUSY_WAIT =
	"This loop's body runs nothing, so it tests its condition again at once and holds a CPU core for as long as it waits. Put a `sleep` in its body and give it a time limit, as in `until check || [ $SECONDS -gt 600 ]; do sleep 2; done`.";
export const GATE_RELEASE_RUN =
	"This runs a released Claude Code program to read it. Read it with the cc-inspect `code` tool instead; its `installs` action lists the releases. `claude --help` on the installed command is still allowed.";
export const GATE_REF_MOVE =
	"This moves a branch to another commit. Resolve the target to a full hash with `git rev-parse <ref>`, move to that hash, and check `git diff --quiet <expected> HEAD` in the same call.";
export const gatePackage = (file: string, use: string, name: string): string =>
	`This repo has ${file}, so it uses ${use}, not ${name}.`;
export const gateRepeated = (times: number, reason: string): string =>
	`This same call was denied ${times} times. The last reason: ${reason.trim() || "none given"}. Change the call, or ask the user.`;
export const gateRepeatedUnexplained = (
	times: number,
	command: string,
): string =>
	`Auto mode denied this same call ${times} times, and the classifier gave no reason, so there is no fact to act on. Give the user the exact command as \`! ${command}\`, which the user can run in the TUI. Do not send this call again, and do not look for another way to it. Go on with the rest of the work.`;

// Advisor: the tool and command that put one question, with the files the asker names, to a stronger model.

const ADVISOR_TOOL = "advisor";

export const ADVISOR_CALL = "mcp__claudetto__advisor";

export const ADVISOR_SYSTEM = `You advise another model that holds the rest of the work. You see the question and the files below, and nothing else of its session. Answer the question directly and name the file and line behind each claim. Say what you could not tell from the files.`;

const ADVISOR_INPUT_SCHEMA: Record<string, unknown> = {
	type: "object",
	properties: {
		question: {
			type: "string",
			description:
				"The question, with each fact it needs: the advisor sees no session. Keep secrets out; the text is scanned and redacted before it goes.",
		},
		files: {
			type: "array",
			items: { type: "string" },
			description: "Paths of the files to send with the question.",
		},
	},
	required: ["question"],
};

export const ADVISOR_SPEC = {
	name: ADVISOR_TOOL,
	description:
		"Asks Fable, a stronger model, one question about the files you name; it sees them and nothing else of this session. Use it for a hard design or review call.",
	inputSchema: ADVISOR_INPUT_SCHEMA,
};

export const ADVISOR_NO_QUESTION = "Send a `question` as non-empty text.";
export const ADVISOR_BAD_FILES = "Send `files` as a list of paths.";
export const ADVISOR_DENIED = (path: string): string =>
	`Nothing was sent: the read rules of this session deny \`${path}\`.`;
export const ADVISOR_UNREADABLE = (path: string, why: string): string =>
	`Nothing was sent: \`${path}\` could not be read (${why}).`;
export const ADVISOR_TOO_BIG = (max: number): string =>
	`Nothing was sent: the question and files hold more than ${max} characters. Name fewer or smaller files.`;
export const ADVISOR_FAILED = (why: string): string =>
	`The advisor gave no answer (${why}).`;

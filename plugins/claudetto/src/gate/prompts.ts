// The texts of the gate rules, and the text of a repeated denial.

/** The reason of the `.catch` of `tool.check`, which asks a person when the gate itself failed. */
export const CHECK_FAIL =
	"The claudetto gate failed. A person must approve this call.";
/** Appended on a new line to the reason of a `Bash` denial in `gate.ts`, except a secret denial, so the model can tell the user how to run the command themselves. */
export const RUN_HINT = (v: { command: string }): string =>
	`If the user wants this command, the user can run \`! ${v.command}\` in the TUI, or \`${v.command}\` in a shell.`;
/** The denial of a delete whose target is the root folder or the home folder. */
export const DENY_ROOT = (v: { target: string }): string =>
	`This command deletes \`${v.target}\`, the root folder or the home folder.`;
/** The denial of a recursive owner or mode change on the root folder or the home folder. */
export const DENY_ROOT_MODE = (v: { target: string }): string =>
	`This command changes the owner or the mode of each file in \`${v.target}\`.`;
/** The denial of a disk eraser, as `erasesDisk` finds it, or a flag that disables a system protection. */
export const DENY_DISK =
	"This command can wipe a disk or disable a system protection.";
/** The denial of a command that runs as the root user. */
export const DENY_ROOT_USER = "This command runs as root.";
/** The denial of a write into a system folder, as `isSystem` defines it. */
export const DENY_SYSTEM_WRITE = (v: { path: string }): string =>
	`This call writes to \`${v.path}\`, a system folder.`;
/** The denial of a read of a secret-bearing file, sent with the `secret` flag so that it gets no `RUN_HINT`; it points the model to `Edit` or `Write`, which the gate answers with a question. */
export const DENY_SECRET = (v: { word: string }): string =>
	`This call reads \`${v.word}\`, which can hold secrets. To change an env file, use \`Edit\` or \`Write\`. The gate asks the user to approve that call. Ask the user for a value that you need.`;
/** The denial of a command that prints the whole environment, with a named-variable alternative. */
export const DENY_ENV_DUMP =
	"This command prints each environment variable. Variables can hold secrets. Print one variable by its name, such as `printenv PATH`. Alternatively, ask the user for the value that you need.";
/** The question for a read whose file name comes from a substitution or from input, when the text holds the name of a secret file. */
export const ASK_SECRET_FED =
	"This command reads a file that comes from a substitution or from its input. The gate cannot read the file name. The text holds the name of a secret file.";
/** The question for a read whose file name the gate cannot resolve, asked only when the project has an env file. */
export const ASK_ENV_FED =
	"This command reads a file. The file name comes from a substitution, from its input, or from a variable with no known value. The gate cannot read the file name. The project has an env file.";
/** The question for a delete whose target word the gate cannot resolve to a path. */
export const ASK_DELETE_UNREAD = (v: { target: string }): string =>
	`The gate cannot read the target \`${v.target}\` of this delete.`;
/** The question for a delete whose paths arrive on standard input in a pipeline. */
export const ASK_DELETE_PIPED =
	"This command deletes the paths that come from its input. The gate cannot read them.";
/** The question for a local `git` verb that can destroy work, naming the verb. */
export const ASK_GIT_LOSS = (v: { verb: string }): string =>
	`The command \`git ${v.verb}\` can delete work that no commit and no reflog keeps.`;
/** The question for a `git push` that forces, deletes, or mirrors, which `remoteRewrite` detects. */
export const ASK_PUSH = "This push rewrites or deletes history on the remote.";
/** The question for a command that drops a database or deletes a database file. */
export const ASK_DB_LOSS = "This command can drop or wipe a database.";
/** The question for a command that destroys a cloud or cluster resource. */
export const ASK_INFRA_LOSS =
	"This command can destroy a cloud or cluster resource.";
/** The question for a move or delete of a file of the user that lies outside the project. */
export const ASK_USER_FILES = (v: { target: string }): string =>
	`This command moves or deletes \`${v.target}\`, a file of the user outside the project.`;
/** The question for a command that sends a file to a remote host. */
export const ASK_UPLOAD = "This command sends a file to a remote host.";
/** The question for a write to a file that runs code or sets a permission or a secret, which asks the model to say what it changes and why. */
export const ASK_PROTECTED = (v: { path: string }): string =>
	`This call changes \`${v.path}\`. That file runs code, or it sets a permission or a secret. Tell the user what you change. Give the reason.`;
/** The question for a subagent's `git stash`, or its `pkill` with a force or full-match flag, which touch what the main agent shares. */
export const ASK_SHARED_TREE =
	"A subagent runs this command. It changes the work tree or the processes that the main agent shares. The main agent can lose its changes or its running tasks.";
/** The question for a bulk `git` stage when the user has uncommitted edits of their own, listing them in `files`. */
export const ASK_BULK_STAGE = (v: { files: string }): string =>
	`This command stages each change of the work tree. The user changed ${v.files}, and the user intends those changes. Stage only the files that you edited, by name.`;
/** The question for a `git` verb that rewrites the whole work tree or the index, such as `stash` or `reset`, when the user has edits of their own listed in `files`. */
export const ASK_WHOLE_TREE = (v: { verb: string; files: string }): string =>
	`The command \`git ${v.verb}\` changes the whole work tree or the index. The user changed ${v.files}, and the user intends those changes. Run this command only when the user asked for it.`;
/** The question for a download piped into a shell. */
export const ASK_DOWNLOAD =
	"This command downloads data from the network and runs it as a shell script.";
/** The question for a command that the parser marked as truncated, so part of it is unread. */
export const ASK_TRUNCATED = "This command is too long for the gate to read.";
/** The question for a command whose program, script, or `git` verb the gate cannot resolve. */
export const ASK_UNKNOWN_PROGRAM =
	"The gate cannot tell what this command runs. A program, a script, or a `git` verb comes from a variable with no known value, a substitution, or an alias. The alias is unknown or too deep.";
/** The question for a `git` call whose config setting can make `git` run a program the gate cannot read. */
export const ASK_GIT_PROGRAM =
	"This `git` call sets a config key or a variable. That setting makes `git` run a program, such as a pager, an editor, a hook, or a helper. The gate cannot read that program.";
/** The denial `stoppedText` in `denials.ts` returns for a call that a rule of the gate denied, with the text of that rule as `rule`. */
export const DENY_GATED = (v: { rule: string }): string =>
	`The claudetto gate denied this call by this rule: ${v.rule}\nStop and report this to the user. Give the rule above. Do not send this call again, and do not look for another way to it.`;
/** The denial `repeatedText` in `denials.ts` returns once the same call was denied the maximum number of times, with the last reason and the `permissions.allow` rule that would admit the call. */
export const DENY_REPEATED_CALL = (v: {
	count: number;
	reason: string;
	rule: string;
}): string =>
	`Auto mode denied this same call ${v.count} times. The reason of the last denial: ${v.reason} Stop and report this to the user. Give the reason above and the rule that would allow the call: \`"${v.rule}"\` in \`permissions.allow\`. Do not send this call again, and do not look for another way to it.`;

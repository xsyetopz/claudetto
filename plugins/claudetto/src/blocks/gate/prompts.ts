export const CHECK_FAIL =
	"The claudetto gate failed. A person must approve this call.";
export const RUN_HINT = (v: { command: string }): string =>
	`If the user wants this command, the user can run \`! ${v.command}\` in the TUI, or \`${v.command}\` in a shell.`;
export const DENY_ROOT = (v: { target: string }): string =>
	`This command deletes \`${v.target}\`, the root folder or the home folder.`;
export const DENY_ROOT_MODE = (v: { target: string }): string =>
	`This command changes the owner or the mode of each file in \`${v.target}\`.`;
export const DENY_DISK =
	"This command can wipe a disk or disable a system protection.";
export const DENY_ROOT_USER = "This command runs as root.";
export const DENY_SYSTEM_WRITE = (v: { path: string }): string =>
	`This call writes to \`${v.path}\`, a system folder.`;
export const DENY_SECRET = (v: { word: string }): string =>
	`This call reads \`${v.word}\`, which can hold secrets. To change an env file, use \`Edit\` or \`Write\`. The gate asks the user to approve that call. Ask the user for a value that you need.`;
export const DENY_SECRET_ARGV = (v: { word: string }): string =>
	`This command puts what it reads from \`${v.word}\` in a program's arguments, where each local user can read it with \`ps\`. Keep the value in the environment: set it in the shell with \`export NAME="$(…)"\`, then start the program with \`exec\`.`;
export const ASK_SECRET_ENV = (v: { word: string }): string =>
	`This command reads \`${v.word}\` into a shell variable, which no output and no program argument shows.`;
export const DENY_ENV_DUMP =
	"This command prints each environment variable. Variables can hold secrets. Print one variable by its name, such as `printenv PATH`. Alternatively, ask the user for the value that you need.";
export const ASK_SECRET_FED =
	"This command reads a file that comes from a substitution or from its input. The gate cannot read the file name. The text holds the name of a secret file.";
export const ASK_ENV_FED =
	"This command reads a file. The file name comes from a substitution, from its input, or from a variable with no known value. The gate cannot read the file name. The project has an env file.";
export const ASK_DELETE_UNREAD = (v: { target: string }): string =>
	`The gate cannot read the target \`${v.target}\` of this delete.`;
export const ASK_DELETE_PIPED =
	"This command deletes the paths that come from its input. The gate cannot read them.";
export const ASK_GIT_LOSS = (v: { verb: string }): string =>
	`The command \`git ${v.verb}\` can delete work that no commit and no reflog keeps.`;
export const ASK_PUSH = "This push rewrites or deletes history on the remote.";
export const ASK_PUSH_HOST = (v: { target: string }): string =>
	`This push sends the repository to \`${v.target}\`, which no remote of the repository names.`;
export const ASK_DB_LOSS = "This command can drop or wipe a database.";
export const ASK_INFRA_LOSS =
	"This command can destroy a cloud or cluster resource.";
export const ASK_USER_FILES = (v: { target: string }): string =>
	`This command moves or deletes \`${v.target}\`, a file of the user outside the project.`;
export const ASK_UPLOAD = "This command sends a file to a remote host.";
export const ASK_PROTECTED = (v: { path: string }): string =>
	`This call changes \`${v.path}\`. That file runs code, or it sets a permission or a secret. Tell the user what you change. Give the reason.`;
export const ASK_SHARED_TREE =
	"A subagent runs this command. It changes the work tree or the processes that the main agent shares. The main agent can lose its changes or its running tasks.";
export const ASK_BULK_STAGE = (v: { files: string }): string =>
	`This command stages each change of the work tree. The user changed ${v.files}, and the user intends those changes. Stage the files that you edited, by name.`;
export const ASK_WHOLE_TREE = (v: { verb: string; files: string }): string =>
	`The command \`git ${v.verb}\` changes the whole work tree or the index. The user changed ${v.files}, and the user intends those changes. Run this command only when the user asked for it.`;
export const ASK_DOWNLOAD =
	"This command downloads data from the network and runs it as a shell script.";
export const ASK_TRUNCATED = "This command is too long for the gate to read.";
export const ASK_UNKNOWN_PROGRAM =
	"The gate cannot tell what this command runs. A program, a script, or a `git` verb comes from a variable with no known value, a substitution, or an alias. The alias is unknown or too deep.";
export const ASK_GIT_PROGRAM =
	"This `git` call sets a config key or a variable. That setting makes `git` run a program, such as a pager, an editor, a hook, or a helper. The gate cannot read that program.";
export const DENY_GATED = (v: { rule: string }): string =>
	`The claudetto gate denied this call by this rule: ${v.rule}\nReport this to the user. Give the rule above. Do not send this call again, and do not look for another way to it.`;
export const DENY_REPEATED_CALL = (v: {
	count: number;
	reason: string;
	rule: string;
}): string =>
	`Auto mode denied this same call ${v.count} times. The reason of the last denial: ${v.reason} Report this to the user. Give the reason above and the rule that would allow the call: \`"${v.rule}"\` in \`permissions.allow\`. Do not send this call again, and do not look for another way to it.`;
export const DENY_REPEATED_UNEXPLAINED = (v: {
	count: number;
	command: string;
}): string =>
	`Auto mode denied this same call ${v.count} times, and the classifier gave no reason, so there is no fact to act on. Report this to the user: give the exact command as \`! ${v.command}\`, which the user can run in the TUI. Do not send this call again, and do not look for another way to it. Go on with the rest of the work.`;

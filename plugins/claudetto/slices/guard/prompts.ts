export const CHECK_FAIL = `The \`guard\` gate failed, so a person must approve this call.`;
export const RUN_HINT = (v: { command: string }): string =>
  `If the user wants this command, they can run \`! ${v.command}\`.`;
export const DENY_ROOT = (v: { target: string }): string =>
  `This command deletes \`${v.target}\`, which is the root folder or the home folder.`;
export const DENY_ROOT_MODE = (v: { target: string }): string =>
  `This command changes the owner or the mode of each file in \`${v.target}\`.`;
export const DENY_DISK = `This command can erase a disk or turn off a protection of the system.`;
export const DENY_ROOT_USER = `This command runs as root.`;
export const DENY_SYSTEM_WRITE = (v: { path: string }): string =>
  `This call writes to \`${v.path}\`, which is a folder of the system.`;
export const DENY_SECRET = (v: { word: string }): string =>
  `This call reads \`${v.word}\`, which can hold secrets. Change a file with \`Edit\` or \`Write\`, and ask the user for a value that you need.`;
export const DENY_ENV_DUMP = `This command prints each environment variable, and they can hold secrets. Print one variable by its name, such as \`printenv PATH\`, or ask the user for the value that you need.`;
export const ASK_DELETE_UNREAD = (v: { target: string }): string =>
  `The gate has no read of the target \`${v.target}\` of this delete.`;
export const ASK_DELETE_PIPED = `This command deletes the paths that come from its input, and the gate has no read of them.`;
export const ASK_GIT_LOSS = (v: { verb: string }): string =>
  `The command \`git ${v.verb}\` can remove work that no commit and no reflog keeps.`;
export const ASK_PUSH = `This push rewrites or deletes history on the remote.`;
export const ASK_DB_LOSS = `This command can drop or wipe a database.`;
export const ASK_INFRA_LOSS = `This command can destroy a cloud or cluster resource.`;
export const ASK_SHARED_TREE = `This command from a subagent changes the work tree or the processes that the main agent shares, so the main agent can lose its changes or its running tasks.`;
export const ASK_BULK_STAGE = (v: { files: string }): string =>
  `This command stages each change of the work tree, and the user changed ${v.files}. A change of the user is intended, so stage only the files that you edited, by name.`;
export const ASK_DOWNLOAD = `This command runs a download from the network as a shell script.`;
export const ASK_TRUNCATED = `This command is too long for the gate to read.`;
export const JEV_QUESTION = `This command can lose files or \`git\` work for good, and the state gives the reason of each loss. Is each file that it can lose safe to lose, such as build output, a cache, a log, or a temp file?`;
export const JEV_STATE = (v: { command: string; reasons: string }): string =>
  `Command: ${v.command}\n${v.reasons}`;
export const JEV_ALLOW = (v: { p: string }): string =>
  `Jev approved this call with \`P(yes)\` = ${v.p}.`;
export const TITLE_FIXED =
  "claudetto set the Chicago Title Case of the `--title` value of this `gh` command. Write the next title in that case.";
export const DENY_MONITOR_DUPLICATE = (v: { id: string }): string =>
  `A \`Monitor\` with this command runs already as task \`${v.id}\`. Use its events, or stop it with \`TaskStop\` and start it again.`;
export const ASK_USAGE_AGENT = (v: { share: string }): string =>
  `The 5-hour share of the plan is ${v.share}, which is red, and another agent runs now. A second agent adds cost at the limit.`;
export const ASK_USAGE_RECIPE = (v: { share: string }): string =>
  `The 5-hour share of the plan is ${v.share}, which is red, and this recipe runs a paid session.`;

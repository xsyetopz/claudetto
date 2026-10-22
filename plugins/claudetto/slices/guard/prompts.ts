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
  `This call reads \`${v.word}\`, which can hold secrets. Ask the user for the value that you need.`;

export const ASK_DELETE = (v: { target: string }): string =>
  `This command deletes \`${v.target}\`, and \`git\` has no commit of each file in it.`;

export const ASK_DELETE_OUTSIDE = (v: { target: string }): string =>
  `This command deletes \`${v.target}\`, which is not in the project or in the temp folder.`;

export const ASK_DELETE_UNREAD = (v: { target: string }): string =>
  `The gate cannot read the target \`${v.target}\` of this delete.`;

export const ASK_DELETE_PIPED = `This command deletes the paths that come from its input, and the gate cannot read them.`;

export const ASK_GIT_LOSS = (v: { verb: string }): string =>
  `The command \`git ${v.verb}\` can remove work that no commit and no reflog keeps.`;

export const ASK_PUSH = `This push rewrites or deletes history on the remote.`;

export const ASK_HIDDEN = `The gate cannot read the commands that this command runs.`;

export const ASK_SCRIPT = (v: { path: string }): string =>
  `This command runs the script \`${v.path}\`, and \`git\` has no commit of it.`;

export const ASK_TRUNCATED = `This command is too long for the gate to read.`;

export const JEV_QUESTION = `This command can lose files or \`git\` work for good, and the state gives the reason of each loss. Is each file that it can lose safe to lose, such as build output, a cache, a log, or a temp file?`;

export const JEV_STATE = (v: { command: string; reasons: string }): string =>
  `Command: ${v.command}\n${v.reasons}`;

export const JEV_ALLOW = (v: { p: string }): string =>
  `Jev approved this call with \`P(yes)\` = ${v.p}.`;

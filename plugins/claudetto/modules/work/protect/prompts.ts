export const UNDONE = (v: { paths: string }): string =>
  `A \`Bash\` command changed ${v.paths}, which only \`Edit\` or \`Write\` may change, so claudetto wrote the file back. Make the change with \`Edit\`.`;

export const NOT_DELETED = (v: { paths: string }): string =>
  `A \`Bash\` command created ${v.paths}, which only \`Edit\` or \`Write\` may change, and claudetto could not delete it. Tell the user that the file is still there.`;

export const NO_COMMITS_AT_START =
  "`git` gave no commits at the first `Bash` call of this session, so claudetto trusts no commit, and it undoes the change that a `git pull` or a `git checkout` makes to a protected file, such as a `tasks.md` or a spec.";

/** What `git ls-remote` reads, by the name of its stamp, for the line `NOT_TRUSTED`. */
export const STAMP_NAMES: { [source: string]: string } = {
  config: "the `git` config",
  ssh: "`~/.ssh/config`",
  env: "an env var of `git` or `ssh`",
  bin: "the file that `ssh` or `git` names in `PATH`",
};

/** Why a remote is not trusted, by the code of `Known.opaque`. */
export const OPAQUE_REASONS: { [code: string]: string } = {
  ssh: "`ssh` runs a program or reads a file there that claudetto cannot read (`Include`, `Match exec`, `ProxyCommand`, `ProxyJump`, `LocalCommand`, `KnownHostsCommand`, or `ControlPath` in `~/.ssh/config`, a `core.sshCommand`, `GIT_SSH`, or `GIT_SSH_COMMAND` that names a program, or an `ssh` that a call can rewrite)",
  git: "`core.gitProxy` or `GIT_PROXY_COMMAND` names a program, and claudetto cannot read what it does",
  all: "`git` is a file that a call can rewrite, and claudetto cannot read what it does",
};

export const STAMP_UNREADABLE =
  "claudetto could not read the settings of `git` at the first `Bash` call";

export const NOT_TRUSTED = (v: { why: string }): string =>
  `claudetto did not trust a remote for the change that it undid, because ${v.why}. A remote counts only when these settings are as they were at the first \`Bash\` call.`;
